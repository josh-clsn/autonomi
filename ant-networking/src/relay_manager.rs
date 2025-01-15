// Copyright 2024 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under The General Public License (GPL), version 3.
// Unless required by applicable law or agreed to in writing, the SAFE Network Software distributed
// under the GPL Licence is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. Please review the Licences for the specific language governing
// permissions and limitations relating to use of the SAFE Network Software.

use crate::driver::{BadNodes, NodeBehaviour};
use itertools::Itertools;
use libp2p::{
    core::transport::ListenerId, multiaddr::Protocol, swarm::ConnectionId, Multiaddr, PeerId,
    StreamProtocol, Swarm,
};
use rand::Rng;
use std::{
    collections::{btree_map::Entry, BTreeMap, HashMap, HashSet, VecDeque},
    time::SystemTime,
};

const MAX_CONCURRENT_RELAY_CONNECTIONS: usize = 4;
const MAX_POTENTIAL_CANDIDATES: usize = 1000;

/// We could get multiple incoming connections from the same peer through multiple relay servers, and only one of them
/// would succeed. So we wait and collect all such connections peer 'from' peer, instead of just recording the
///  success/failure for eachconnection.
const MAX_DURATION_TO_TRACK_INCOMING_CONNECTIONS_PER_PEER: std::time::Duration =
    std::time::Duration::from_secs(20);

/// The connections from a single peer through multiple relay servers.
type ConnectionsFromPeer = Vec<(PeerId, ConnectionId, SystemTime, Option<bool>)>;

pub(crate) fn is_a_relayed_peer(addrs: &HashSet<Multiaddr>) -> bool {
    addrs
        .iter()
        .any(|multiaddr| multiaddr.iter().any(|p| matches!(p, Protocol::P2pCircuit)))
}

/// Manage the relay servers that a private node is connected to.
/// This is the client side of the relay server protocol.
#[derive(Debug)]
pub(crate) struct RelayManager {
    self_peer_id: PeerId,
    /// The potential relay servers that we can connect to.
    relay_server_candidates: VecDeque<(PeerId, Multiaddr)>,
    /// The relay servers that we are waiting for a reservation from.
    waiting_for_reservation: BTreeMap<PeerId, Multiaddr>,
    /// The relay servers that we are connected to.
    connected_relay_servers: BTreeMap<PeerId, Multiaddr>,
    /// Tracker for the relayed listen addresses.
    relayed_listener_id_map: HashMap<ListenerId, PeerId>,
    /// Health of the relayed connections. If the relayed connection is not healthy, we should try to connect to another
    /// relay.
    reservation_health: RelayReservationHealth,
}

#[derive(Debug, Default)]
struct RelayReservationHealth {
    /// We could have multiple incoming connections from the same peer through multiple relay servers. But we could
    /// just have a single one as well.
    /// This is a map of the 'from peer' to the multiple relay servers that the incoming connections are coming through.
    incoming_connections_from_remote_peer: BTreeMap<PeerId, ConnectionsFromPeer>,
    reservation_score: BTreeMap<PeerId, ReservationStat>,
}

#[derive(Debug, Default, Clone)]
struct ReservationStat {
    succeeded: usize,
    error: usize,
}

impl ReservationStat {
    fn success_rate(&self) -> f64 {
        if self.succeeded + self.error == 0 {
            0.0
        } else {
            self.succeeded as f64 / (self.succeeded + self.error) as f64
        }
    }

    fn is_faulty(&self) -> bool {
        // Give the relay server a chance to prove itself
        if self.succeeded + self.error < 30 {
            return false;
        }

        // Still give the address a chance to prove itself
        if self.succeeded + self.error < 100 {
            return self.success_rate() < 0.5;
        }

        self.success_rate() < 0.9
    }
}

impl RelayManager {
    pub(crate) fn new(self_peer_id: PeerId) -> Self {
        Self {
            self_peer_id,
            connected_relay_servers: Default::default(),
            waiting_for_reservation: Default::default(),
            relay_server_candidates: Default::default(),
            relayed_listener_id_map: Default::default(),
            reservation_health: Default::default(),
        }
    }

    /// Should we keep this peer alive? Closing a connection to that peer would remove that server from the listen addr.
    pub(crate) fn keep_alive_peer(&self, peer_id: &PeerId) -> bool {
        self.connected_relay_servers.contains_key(peer_id)
            || self.waiting_for_reservation.contains_key(peer_id)
    }

    /// Add a potential candidate to the list if it satisfies all the identify checks and also supports the relay server
    /// protocol.
    pub(crate) fn add_potential_candidates(
        &mut self,
        peer_id: &PeerId,
        addrs: &HashSet<Multiaddr>,
        stream_protocols: &Vec<StreamProtocol>,
    ) {
        if self.relay_server_candidates.len() >= MAX_POTENTIAL_CANDIDATES {
            return;
        }

        if Self::does_it_support_relay_server_protocol(stream_protocols) {
            // todo: collect and manage multiple addrs
            if let Some(addr) = addrs.iter().next() {
                // The calling place shall already checked whether the peer is `relayed`.
                // Hence here can add the addr directly.
                if let Some(relay_addr) = Self::craft_relay_address(addr, Some(*peer_id)) {
                    debug!("Adding {peer_id:?} with {relay_addr:?} as a potential relay candidate");
                    self.relay_server_candidates
                        .push_back((*peer_id, relay_addr));
                }
            }
        } else {
            debug!("Peer {peer_id:?} does not support relay server protocol");
        }
    }

    // todo: how do we know if a reservation has been revoked / if the peer has gone offline?
    /// Try connecting to candidate relays if we are below the threshold connections.
    /// This is run periodically on a loop.
    pub(crate) fn try_connecting_to_relay(
        &mut self,
        swarm: &mut Swarm<NodeBehaviour>,
        bad_nodes: &BadNodes,
    ) {
        self.remove_faulty_relay_servers(swarm);

        if self.connected_relay_servers.len() >= MAX_CONCURRENT_RELAY_CONNECTIONS
            || self.relay_server_candidates.is_empty()
        {
            return;
        }

        let reservations_to_make =
            MAX_CONCURRENT_RELAY_CONNECTIONS - self.connected_relay_servers.len();
        let mut n_reservations = 0;

        while n_reservations < reservations_to_make {
            // todo: should we remove all our other `listen_addr`? And should we block from adding `add_external_address` if
            // we're behind nat?

            // Pick a random candidate from the vector. Check if empty, or `gen_range` panics for empty range.
            let index = if self.relay_server_candidates.is_empty() {
                debug!("No more relay candidates.");
                break;
            } else {
                rand::thread_rng().gen_range(0..self.relay_server_candidates.len())
            };

            if let Some((peer_id, relay_addr)) = self.relay_server_candidates.remove(index) {
                // skip if detected as a bad node
                if let Some((_, is_bad)) = bad_nodes.get(&peer_id) {
                    if *is_bad {
                        debug!("Peer {peer_id:?} is considered as a bad node. Skipping it.");
                        continue;
                    }
                }

                if self.connected_relay_servers.contains_key(&peer_id)
                    || self.waiting_for_reservation.contains_key(&peer_id)
                {
                    debug!("We are already using {peer_id:?} as a relay server. Skipping.");
                    continue;
                }

                match swarm.listen_on(relay_addr.clone()) {
                    Ok(id) => {
                        info!("Sending reservation to relay {peer_id:?} on {relay_addr:?}");
                        self.waiting_for_reservation.insert(peer_id, relay_addr);
                        self.relayed_listener_id_map.insert(id, peer_id);
                        n_reservations += 1;
                    }
                    Err(err) => {
                        error!("Error while trying to listen on the relay addr: {err:?} on {relay_addr:?}");
                    }
                }
            } else {
                debug!("No more relay candidates.");
                break;
            }
        }
    }

    /// Update client state after we've successfully made reservation with a relay.
    pub(crate) fn on_successful_reservation_by_client(
        &mut self,
        peer_id: &PeerId,
        swarm: &mut Swarm<NodeBehaviour>,
    ) {
        if tracing::level_enabled!(tracing::Level::DEBUG) {
            let all_external_addresses = swarm.external_addresses().collect_vec();
            let all_listeners = swarm.listeners().collect_vec();
            debug!("All our listeners: {all_listeners:?}");
            debug!("All our external addresses: {all_external_addresses:?}");
        }

        match self.waiting_for_reservation.remove(peer_id) {
            Some(addr) => {
                info!("Successfully made reservation with {peer_id:?} on {addr:?}. Adding the addr to external address.");
                swarm.add_external_address(addr.clone());
                self.connected_relay_servers.insert(*peer_id, addr);
            }
            None => {
                debug!("Made a reservation with a peer that we had not requested to");
            }
        }
    }

    /// Update client state if the reservation has been cancelled or if the relay has closed.
    pub(crate) fn on_listener_closed(
        &mut self,
        listener_id: &ListenerId,
        swarm: &mut Swarm<NodeBehaviour>,
    ) {
        let Some(peer_id) = self.relayed_listener_id_map.remove(listener_id) else {
            return;
        };

        if let Some(addr) = self.connected_relay_servers.remove(&peer_id) {
            info!("Removing connected relay server as the listener has been closed: {peer_id:?}");
            info!("Removing external addr: {addr:?}");
            swarm.remove_external_address(&addr);

            // Even though we craft and store addrs in this format /ip4/198.51.100.0/tcp/55555/p2p/QmRelay/p2p-circuit/,
            // sometimes our PeerId is added at the end by the swarm?, which we want to remove as well i.e.,
            // /ip4/198.51.100.0/tcp/55555/p2p/QmRelay/p2p-circuit/p2p/QmSelf
            let Ok(addr_with_self_peer_id) = addr.with_p2p(self.self_peer_id) else {
                return;
            };
            info!("Removing external addr: {addr_with_self_peer_id:?}");
            swarm.remove_external_address(&addr_with_self_peer_id);
        }
        if let Some(addr) = self.waiting_for_reservation.remove(&peer_id) {
            info!("Removed peer form waiting_for_reservation as the listener has been closed {peer_id:?}: {addr:?}");
            debug!(
                "waiting_for_reservation len: {:?}",
                self.waiting_for_reservation.len()
            )
        }
    }

    /// Remove the faulty relay server.
    fn remove_faulty_relay_servers(&mut self, swarm: &mut Swarm<NodeBehaviour>) {
        let faulty_relay_servers = self
            .reservation_health
            .reservation_score
            .iter()
            .filter(|(_, stat)| stat.is_faulty())
            .map(|(peer_id, stat)| (*peer_id, stat.clone()))
            .collect_vec();

        for (relay_server, score) in faulty_relay_servers {
            let Some(listener_id) =
                self.relayed_listener_id_map
                    .iter()
                    .find_map(|(id, id_peer)| {
                        if *id_peer == relay_server {
                            Some(*id)
                        } else {
                            None
                        }
                    })
            else {
                error!("Could not find the listener id for the relay server {relay_server:?}");
                continue;
            };

            info!(
                "Removing faulty relay server: {relay_server:?} on {listener_id:?} with score: {}",
                score.success_rate()
            );
            debug!("Removing faulty relay server {relay_server:?} on {listener_id:?}, {score:?}");

            let result = swarm.remove_listener(listener_id);
            info!("Result of removing listener: {result:?}");

            self.on_listener_closed(&listener_id, swarm);

            self.reservation_health
                .reservation_score
                .remove(&relay_server);
        }

        self.reservation_health
            .cleanup_stats(&self.connected_relay_servers);
    }

    /// Track the incoming connections to monitor the health of a reservation.
    pub(crate) fn on_incoming_connection(
        &mut self,
        connection_id: &ConnectionId,
        local_addr: &Multiaddr,
        send_back_addr: &Multiaddr,
    ) {
        self.reservation_health
            .on_incoming_connection(connection_id, local_addr, send_back_addr);
    }

    /// Track the connection established to monitor the health of a reservation.
    pub(crate) fn on_connection_established(
        &mut self,
        from_peer: &PeerId,
        connection_id: &ConnectionId,
    ) {
        self.reservation_health
            .on_connection_established(from_peer, connection_id);
    }

    /// Track the connection error to monitor the health of a reservation.
    pub(crate) fn on_incomming_connection_error(
        &mut self,
        send_back_addr: &Multiaddr,
        connection_id: &ConnectionId,
    ) {
        self.reservation_health
            .on_incomming_connection_error(send_back_addr, connection_id);
    }

    fn does_it_support_relay_server_protocol(protocols: &Vec<StreamProtocol>) -> bool {
        for stream_protocol in protocols {
            if *stream_protocol == "/libp2p/circuit/relay/0.2.0/stop" {
                return true;
            }
        }
        false
    }

    /// The listen addr should be something like /ip4/198.51.100.0/tcp/55555/p2p/QmRelay/p2p-circuit/
    fn craft_relay_address(addr: &Multiaddr, peer_id: Option<PeerId>) -> Option<Multiaddr> {
        let mut output_addr = Multiaddr::empty();

        let ip = addr
            .iter()
            .find(|protocol| matches!(protocol, Protocol::Ip4(_)))?;
        output_addr.push(ip);
        let port = addr
            .iter()
            .find(|protocol| matches!(protocol, Protocol::Udp(_)))?;
        output_addr.push(port);
        output_addr.push(Protocol::QuicV1);

        let peer_id = {
            if let Some(peer_id) = peer_id {
                Protocol::P2p(peer_id)
            } else {
                addr.iter()
                    .find(|protocol| matches!(protocol, Protocol::P2p(_)))?
            }
        };
        output_addr.push(peer_id);
        output_addr.push(Protocol::P2pCircuit);

        debug!("Crafted p2p relay address: {output_addr:?}");
        Some(output_addr)
    }
}

impl RelayReservationHealth {
    fn on_incoming_connection(
        &mut self,
        connection_id: &ConnectionId,
        // The local addr would look something like this
        // /ip4/138.68.152.2/udp/39821/quic-v1/p2p/12D3KooWHHVo7euYruLYEZHiwZcHG6p99XqHzjyt8MaZPiEKk5Sp/p2p-circuit
        local_addr: &Multiaddr,
        // The send back addr would not contain the ip addr, but just the peer ids for private nodes.
        // send_back_addr: /p2p/12D3KooWGsKUTLCp6Vi8e9hxUMxAtU5CjPynYKqg77KBco5qBMqD
        send_back_addr: &Multiaddr,
    ) {
        let relay_server = {
            if !local_addr
                .iter()
                .any(|protocol| matches!(protocol, Protocol::P2pCircuit))
            {
                debug!("Incoming connection is not routed through a relay server. Not tracking its health.");
                return;
            };

            match local_addr.iter().find(|p| matches!(p, Protocol::P2p(_))) {
                Some(Protocol::P2p(id)) => id,
                _ => {
                    debug!("Incoming connection does not have a valid 'relay server id'. Not tracking its health.");
                    return;
                }
            }
        };

        let from_peer = {
            match send_back_addr
                .iter()
                .find(|p| matches!(p, Protocol::P2p(_)))
            {
                Some(Protocol::P2p(id)) => id,
                _ => {
                    debug!("Incoming connection does not have a valid 'from peer id'. Not tracking its health.");
                    return;
                }
            }
        };

        match self.incoming_connections_from_remote_peer.entry(from_peer) {
            Entry::Occupied(mut entry) => {
                entry
                    .get_mut()
                    .push((relay_server, *connection_id, SystemTime::now(), None));
            }
            Entry::Vacant(entry) => {
                entry.insert(vec![(
                    relay_server,
                    *connection_id,
                    SystemTime::now(),
                    None,
                )]);
            }
        }
    }

    fn on_connection_established(&mut self, from_peer: &PeerId, connection_id: &ConnectionId) {
        if let Some(connections) = self
            .incoming_connections_from_remote_peer
            .get_mut(from_peer)
        {
            if let Some((_, _, _, succeeded)) = connections
                .iter_mut()
                .find(|(_, id, _, _)| id == connection_id)
            {
                *succeeded = Some(true);
            }
        }

        self.try_update_stat();
    }

    fn on_incomming_connection_error(
        &mut self,
        send_back_addr: &Multiaddr,
        connection_id: &ConnectionId,
    ) {
        let from_peer = {
            match send_back_addr
                .iter()
                .find(|p| matches!(p, Protocol::P2p(_)))
            {
                Some(Protocol::P2p(id)) => id,
                _ => {
                    debug!("Incoming connection does not have a valid 'from peer id'. Not tracking its health.");
                    return;
                }
            }
        };

        if let Some(connections) = self
            .incoming_connections_from_remote_peer
            .get_mut(&from_peer)
        {
            if let Some((_, _, _, succeeded)) = connections
                .iter_mut()
                .find(|(_, id, _, _)| id == connection_id)
            {
                *succeeded = Some(false);
            }
        }

        self.try_update_stat();
    }

    fn try_update_stat(&mut self) {
        let mut to_remove = Vec::new();

        for (from_peer, connections) in self.incoming_connections_from_remote_peer.iter_mut() {
            let Some(latest_time) = connections.iter().map(|(_, _, time, _)| time).max() else {
                debug!("The incoming connections from {from_peer:?} are empty. Skipping.");
                continue;
            };

            let Ok(elapsed) = SystemTime::now().duration_since(*latest_time) else {
                debug!("Could not obtain elapsed time.");
                continue;
            };

            if elapsed < MAX_DURATION_TO_TRACK_INCOMING_CONNECTIONS_PER_PEER {
                debug!("There is still an active incoming connection from {from_peer:?} that is waiting to be established. Skipping.");
                continue;
            }

            // if atleast one connection has been established, we can update the stats.
            let mut connection_success = false;
            for (relay_server, connection_id, _, _) in connections
                .iter()
                .filter(|(_, _, _, result)| result.is_some_and(|succeeded| succeeded))
            {
                connection_success = true;
                debug!("Connection {connection_id:?} from {from_peer:?} through {relay_server:?} has been successful. Increasing the succces count");
                match self.reservation_score.entry(*relay_server) {
                    Entry::Occupied(mut entry) => {
                        let stat = entry.get_mut();

                        let new_value = stat.succeeded.checked_add(1);
                        if let Some(new_value) = new_value {
                            stat.succeeded = new_value;
                        } else {
                            // roll over to not saturate the value. Else the success rate would keep decreasing.
                            stat.succeeded = 1;
                            stat.error = 0;
                        }
                    }
                    Entry::Vacant(entry) => {
                        entry.insert(ReservationStat {
                            succeeded: 1,
                            error: 0,
                        });
                    }
                }
            }

            if !connection_success {
                // if none of the connections have been established, we can update the stats.
                for (relay_server, connection_id, _, result) in connections.iter() {
                    if result.is_none() {
                        debug!("Connection {connection_id:?} from {from_peer:?} through {relay_server:?} is still pending after {elapsed:?}. This is thrown away.");
                        continue;
                    };
                    debug!("Connection {connection_id:?} from {from_peer:?} through {relay_server:?} is a failure. Increasing the error count");
                    match self.reservation_score.entry(*relay_server) {
                        Entry::Occupied(mut entry) => {
                            let stat = entry.get_mut();

                            let new_value = stat.error.checked_add(1);
                            if let Some(new_value) = new_value {
                                stat.error = new_value;
                            } else {
                                stat.error = 1;
                                stat.succeeded = 0;
                            }
                        }
                        Entry::Vacant(entry) => {
                            entry.insert(ReservationStat {
                                succeeded: 0,
                                error: 1,
                            });
                        }
                    }
                }
            }

            to_remove.push(*from_peer);
        }

        for from_peer in to_remove {
            debug!("Removing {from_peer:?} from the incoming_connections_from_remote_peer");
            self.incoming_connections_from_remote_peer
                .remove(&from_peer);
        }

        self.log_reservation_score();
    }

    /// Clean up the stats for relay servers that we are no longer connected to.
    fn cleanup_stats(&mut self, connected_relay_servers: &BTreeMap<PeerId, Multiaddr>) {
        let mut to_remove = Vec::new();
        for (relay_server, _) in self.reservation_score.iter() {
            if !connected_relay_servers.contains_key(relay_server) {
                to_remove.push(*relay_server);
            }
        }

        for relay_server in to_remove {
            debug!("Removing {relay_server:?} from the reservation_score as we are no longer connected to it.");
            self.reservation_score.remove(&relay_server);
        }
    }

    fn log_reservation_score(&self) {
        for (relay_server, stat) in self.reservation_score.iter() {
            debug!(
                "Reservation score for {relay_server:?}: {:?}",
                stat.success_rate()
            );
        }
    }
}
