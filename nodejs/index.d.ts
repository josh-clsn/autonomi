/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface ArchiveFile {
  path: string
  created: bigint
  modified: bigint
  size: bigint
  extra?: string
}
export type JsClient = Client
/** Represents a client for the Autonomi network. */
export declare class Client {
  /**
   * Initialize the client with default configuration.
   *
   * See `init_with_config`.
   */
  static init(): Promise<JsClient>
  /**
   * Initialize a client that is configured to be local.
   *
   * See `init_with_config`.
   */
  static initLocal(): Promise<JsClient>
  /**
   * Initialize a client that bootstraps from a list of peers.
   *
   * If any of the provided peers is a global address, the client will not be local.
   */
  static initWithPeers(peers: Array<string>): Promise<Client>
  evmNetwork(): JsNetwork
  /** Get a chunk from the network. */
  chunkGet(addr: JsChunkAddress): Promise<Buffer>
  /**
   * Manually upload a chunk to the network.
   *
   * It is recommended to use the `data_put` method instead to upload data.
   */
  chunkPut(data: Buffer, paymentOption: JsPaymentOption): Promise<ChunkPut>
  /** Get the cost of a chunk. */
  chunkCost(addr: JsChunkAddress): Promise<string>
  /** Fetches a GraphEntry from the network. */
  graphEntryGet(address: JsGraphEntryAddress): Promise<JsGraphEntry>
  /** Check if a graph_entry exists on the network */
  graphEntryCheckExistance(address: JsGraphEntryAddress): Promise<boolean>
  /** Manually puts a GraphEntry to the network. */
  graphEntryPut(entry: JsGraphEntry, paymentOption: JsPaymentOption): Promise<GraphEntryPut>
  /** Get the cost to create a GraphEntry */
  graphEntryCost(key: JsPublicKey): Promise<string>
  /** Get a pointer from the network */
  pointerGet(address: JsPointerAddress): Promise<JsPointer>
  /** Check if a pointer exists on the network */
  pointerCheckExistance(address: JsPointerAddress): Promise<boolean>
  /** Verify a pointer */
  static pointerVerify(pointer: JsPointer): void
  /** Manually store a pointer on the network */
  pointerPut(pointer: JsPointer, paymentOption: JsPaymentOption): Promise<PointerPut>
  /**
   * Create a new pointer on the network.
   *
   * Make sure that the owner key is not already used for another pointer as each key is associated with one pointer
   */
  pointerCreate(owner: JsSecretKey, target: JsPointerTarget, paymentOption: JsPaymentOption): Promise<PointerPut>
  /**
   * Update an existing pointer to point to a new target on the network.
   *
   * The pointer needs to be created first with Client::pointer_put.
   * This operation is free as the pointer was already paid for at creation.
   * Only the latest version of the pointer is kept on the Network,
   * previous versions will be overwritten and unrecoverable.
   */
  pointerUpdate(owner: JsSecretKey, target: JsPointerTarget): Promise<void>
  /** Calculate the cost of storing a pointer */
  pointerCost(key: JsPublicKey): Promise<string>
  /** Get Scratchpad from the Network. A Scratchpad is stored at the owner's public key so we can derive the address from it. */
  scratchpadGetFromPublicKey(publicKey: JsPublicKey): Promise<JsScratchpad>
  /** Get Scratchpad from the Network */
  scratchpadGet(address: JsScratchpadAddress): Promise<JsScratchpad>
  /** Check if a scratchpad exists on the network */
  scratchpadCheckExistance(address: JsScratchpadAddress): Promise<boolean>
  /** Verify a scratchpad */
  static scratchpadVerify(scratchpad: JsScratchpad): void
  /** Manually store a scratchpad on the network */
  scratchpadPut(scratchpad: JsScratchpad, paymentOption: JsPaymentOption): Promise<ScratchpadPut>
  /**
   * Create a new scratchpad to the network.
   *
   * Make sure that the owner key is not already used for another scratchpad as each key is associated with one scratchpad. The data will be encrypted with the owner key before being stored on the network. The content type is used to identify the type of data stored in the scratchpad, the choice is up to the caller.
   *
   * Returns the cost and the address of the scratchpad.
   */
  scratchpadCreate(owner: JsSecretKey, contentType: bigint, initialData: Buffer, paymentOption: JsPaymentOption): Promise<ScratchpadPut>
  /**
   * Update an existing scratchpad to the network.
   * The scratchpad needs to be created first with Client::scratchpad_create.
   * This operation is free as the scratchpad was already paid for at creation.
   * Only the latest version of the scratchpad is kept on the Network,
   * previous versions will be overwritten and unrecoverable.
   */
  scratchpadUpdate(owner: JsSecretKey, contentType: bigint, data: Buffer): Promise<void>
  /** Get the cost of creating a new Scratchpad */
  scratchpadCost(owner: JsPublicKey): Promise<string>
  /** Fetch a blob of (private) data from the network */
  dataGet(dataMap: JsDataMapChunk): Promise<Buffer>
  /**
   * Upload a piece of private data to the network. This data will be self-encrypted.
   * The DataMapChunk is not uploaded to the network, keeping the data private.
   *
   * Returns the DataMapChunk containing the map to the encrypted chunks.
   */
  dataPut(data: Buffer, paymentOption: JsPaymentOption): Promise<DataPutResult>
  /** Fetch a blob of data from the network */
  dataGetPublic(addr: JsDataAddress): Promise<Buffer>
  /**
   * Upload a piece of data to the network. This data is publicly accessible.
   *
   * Returns the Data Address at which the data was stored.
   */
  dataPutPublic(data: Buffer, paymentOption: JsPaymentOption): Promise<DataPutPublicResult>
  /** Get the estimated cost of storing a piece of data. */
  dataCost(data: Buffer): Promise<string>
  /** Fetch a PrivateArchive from the network */
  archiveGet(addr: JsPrivateArchiveDataMap): Promise<JsPrivateArchive>
  /** Upload a PrivateArchive to the network */
  archivePut(archive: JsPrivateArchive, paymentOption: JsPaymentOption): Promise<ArchivePutResult>
  /** Fetch an archive from the network */
  archiveGetPublic(addr: JsArchiveAddress): Promise<JsPublicArchive>
  /** Upload an archive to the network */
  archivePutPublic(archive: JsPublicArchive, paymentOption: JsPaymentOption): Promise<ArchivePutPublicResult>
  /** Get the cost to upload an archive */
  archiveCost(archive: JsPublicArchive): Promise<string>
  /** Download a private file from network to local file system */
  fileDownload(dataMap: JsDataMapChunk, toDest: string): Promise<void>
  /** Download a private directory from network to local file system */
  dirDownload(archiveAccess: JsPrivateArchiveDataMap, toDest: string): Promise<void>
  /**
   * Upload the content of all files in a directory to the network.
   * The directory is recursively walked and each file is uploaded to the network.
   *
   * The data maps of these (private) files are not uploaded but returned within
   * the PrivateArchive return type.
   */
  dirContentUpload(dirPath: string, paymentOption: JsPaymentOption): Promise<DirContentUpload>
  /**
   * Same as Client::dir_content_upload but also uploads the archive (privately) to the network.
   *
   * Returns the PrivateArchiveDataMap allowing the private archive to be downloaded from the network.
   */
  dirUpload(dirPath: string, paymentOption: JsPaymentOption): Promise<DirUpload>
  /**
   * Upload the content of a private file to the network. Reads file, splits into
   * chunks, uploads chunks, uploads datamap, returns DataMapChunk (pointing to the datamap)
   */
  fileContentUpload(path: string, paymentOption: JsPaymentOption): Promise<FileContentUpload>
  /** Download file from network to local file system */
  fileDownloadPublic(dataAddr: JsDataAddress, toDest: string): Promise<void>
  /** Download directory from network to local file system */
  dirDownloadPublic(archiveAddr: JsArchiveAddress, toDest: string): Promise<void>
  /**
   * Upload the content of all files in a directory to the network. The directory is recursively walked and each file is uploaded to the network.
   *
   * The data maps of these files are uploaded on the network, making the individual files publicly available.
   *
   * This returns, but does not upload (!),the PublicArchive containing the data maps of the uploaded files.
   */
  dirContentUploadPublic(dirPath: string, paymentOption: JsPaymentOption): Promise<DirContentUploadPublic>
  /**
   * Same as Client::dir_content_upload_public but also uploads the archive to the network.
   *
   * Returns the ArchiveAddress of the uploaded archive.
   */
  dirUploadPublic(dirPath: string, paymentOption: JsPaymentOption): Promise<DirUploadPublic>
  /**
   * Upload the content of a file to the network. Reads file, splits into chunks,
   * uploads chunks, uploads datamap, returns DataAddr (pointing to the datamap)
   */
  fileContentUploadPublic(path: string, paymentOption: JsPaymentOption): Promise<FileContentUploadPublic>
  /** Get the cost to upload a file/dir to the network. quick and dirty implementation, please refactor once files are cleanly implemented */
  fileCost(path: string): Promise<string>
  /** Get the user data from the vault */
  getUserDataFromVault(secretKey: JsVaultSecretKey): Promise<JsUserData>
  /**
   * Put the user data to the vault
   *
   * Returns the total cost of the put operation
   */
  putUserDataToVault(secretKey: JsVaultSecretKey, paymentOption: JsPaymentOption, userData: JsUserData): Promise<string>
  /**
   * Retrieves and returns a decrypted vault if one exists.
   *
   * Returns the content type of the bytes in the vault.
   */
  fetchAndDecryptVault(secretKey: JsVaultSecretKey): Promise<FetchAndDecryptVault>
  /**
   * Get the cost of creating a new vault A quick estimation of cost:
   * num_of_graph_entry * graph_entry_cost + num_of_scratchpad * scratchpad_cost
   */
  vaultCost(owner: JsVaultSecretKey, maxSize: bigint): Promise<string>
  /**
   * Put data into the client’s VaultPacket
   *
   * Dynamically expand the vault capacity by paying for more space (Scratchpad) when needed.
   *
   * It is recommended to use the hash of the app name or unique identifier as the content type.
   */
  writeBytesToVault(data: Buffer, paymentOption: JsPaymentOption, secretKey: JsVaultSecretKey, contentType: JsVaultContentType): Promise<string>
  /**
   * Get the register history, starting from the root to the latest entry.
   *
   * This returns a RegisterHistory that can be use to get the register values from the history.
   *
   * RegisterHistory::next can be used to get the values one by one, from the first to the latest entry.
   * RegisterHistory::collect can be used to get all the register values from the history from the first to the latest entry.
   */
  registerHistory(addr: JsRegisterAddress): JsRegisterHistory
  /**
   * Create a new register key from a SecretKey and a name.
   *
   * This derives a new SecretKey from the owner’s SecretKey using the name. Note that you will need to keep track of the names you used to create the register key.
   */
  static registerKeyFromName(owner: JsSecretKey, name: string): JsSecretKey
  /** Create a new RegisterValue from bytes, make sure the bytes are not longer than REGISTER_VALUE_SIZE */
  static registerValueFromBytes(bytes: Uint8Array): Uint8Array
  /**
   * Create a new register with an initial value.
   *
   * Note that two payments are required, one for the underlying GraphEntry and one for the crate::Pointer
   */
  registerCreate(owner: JsSecretKey, initialValue: Uint8Array, paymentOption: JsPaymentOption): Promise<RegisterCreate>
  /**
   * Update the value of a register.
   * The register needs to be created first with Client::register_create
   */
  registerUpdate(owner: JsSecretKey, newValue: Uint8Array, paymentOption: JsPaymentOption): Promise<string>
  /** Get the current value of the register */
  registerGet(addr: JsRegisterAddress): Promise<Uint8Array>
  /** Get the cost of a register operation. Returns the cost of creation if it doesn’t exist, else returns the cost of an update */
  registerCost(owner: JsPublicKey): Promise<string>
}
export declare class ChunkPut {
  get cost(): string
  get addr(): JsChunkAddress
}
export declare class GraphEntryPut {
  get cost(): string
  get addr(): JsGraphEntryAddress
}
export declare class ScratchpadPut {
  get cost(): string
  get addr(): JsScratchpadAddress
}
export declare class PointerPut {
  get cost(): string
  get addr(): JsPointerAddress
}
export declare class DataPutResult {
  get cost(): string
  get dataMap(): JsDataMapChunk
}
export declare class DataPutPublicResult {
  get cost(): string
  get addr(): JsDataAddress
}
export declare class ArchivePutResult {
  get cost(): string
  get dataMap(): JsPrivateArchiveDataMap
}
export declare class ArchivePutPublicResult {
  get cost(): string
  get addr(): JsDataAddress
}
export declare class DirContentUpload {
  get cost(): string
  get archive(): JsPrivateArchive
}
export declare class DirUpload {
  get cost(): string
  get dataMap(): JsDataMapChunk
}
export declare class FileContentUpload {
  get cost(): string
  get dataMap(): JsDataMapChunk
}
export declare class DirContentUploadPublic {
  get cost(): string
  get addr(): JsPublicArchive
}
export declare class DirUploadPublic {
  get cost(): string
  get addr(): JsArchiveAddress
}
export declare class FileContentUploadPublic {
  get cost(): string
  get addr(): JsPointerAddress
}
export declare class FetchAndDecryptVault {
  get data(): Buffer
  get contentType(): bigint
}
export declare class RegisterCreate {
  get cost(): string
  get addr(): JsRegisterAddress
}
export declare class GraphEntryDescendant {
  get publicKey(): JsPublicKey
  get content(): Uint8Array
}
export type JsXorName = XorName
/**
 * A 256-bit number, viewed as a point in XOR space.
 *
 * This wraps an array of 32 bytes, i. e. a number between 0 and 2<sup>256</sup> - 1.
 *
 * XOR space is the space of these numbers, with the [XOR metric][1] as a notion of distance,
 * i. e. the points with IDs `x` and `y` are considered to have distance `x xor y`.
 *
 * [1]: https://en.wikipedia.org/wiki/Kademlia#System_details
 */
export declare class XorName {
  /** Generate a XorName for the given content. */
  static fromContent(content: Uint8Array): JsXorName
  /** Generate a random XorName */
  static random(): JsXorName
}
export type JsChunkAddress = ChunkAddress
/**
 * Address of a chunk.
 *
 * It is derived from the content of the chunk.
 */
export declare class ChunkAddress {
  /** Creates a new ChunkAddress. */
  constructor(xorName: XorName)
  /** Returns the XorName. */
  xorname(): XorName
  /** Returns the hex string representation of the address. */
  toHex(): string
  /** Creates a new ChunkAddress from a hex string. */
  static fromHex(hex: string): JsChunkAddress
}
export type JsGraphEntryAddress = GraphEntryAddress
/**
 * Address of a `GraphEntry`.
 *
 * It is derived from the owner's unique public key
 */
export declare class GraphEntryAddress {
  /** Creates a new GraphEntryAddress. */
  constructor(owner: JsPublicKey)
  /**
   * Return the network name of the scratchpad.
   * This is used to locate the scratchpad on the network.
   */
  xorname(): XorName
  /** Serialize this `GraphEntryAddress` into a hex-encoded string. */
  toHex(): string
  /** Parse a hex-encoded string into a `GraphEntryAddress`. */
  static fromHex(hex: string): JsGraphEntryAddress
}
export type JsDataAddress = DataAddress
export declare class DataAddress { }
export type JsArchiveAddress = ArchiveAddress
export declare class ArchiveAddress { }
export type JsWallet = Wallet
/** A wallet for interacting with the network's payment system */
export declare class Wallet {
  /** Creates a new Wallet based on the given Ethereum private key. It will fail with Error::PrivateKeyInvalid if private_key is invalid. */
  static newFromPrivateKey(network: JsNetwork, privateKey: string): JsWallet
  /** Returns a string representation of the wallet's address */
  address(): string
  /** Returns the raw balance of payment tokens in the wallet */
  balance(): Promise<string>
  /** Returns the current balance of gas tokens in the wallet */
  balanceOfGas(): Promise<string>
}
export type JsPaymentOption = PaymentOption
/** Options for making payments on the network */
export declare class PaymentOption {
  static fromWallet(wallet: Wallet): JsPaymentOption
  static fromReceipt(): JsPaymentOption
}
export type JsNetwork = Network
export declare class Network {
  constructor(local: boolean)
}
export type JsPublicKey = PublicKey
export declare class PublicKey {
  /** Returns a byte string representation of the public key. */
  toBytes(): Uint8Array
  /** Returns the key with the given representation, if valid. */
  static fromBytes(bytes: Uint8Array): JsPublicKey
  /** Returns the hex string representation of the public key. */
  toHex(): string
  /** Creates a new PublicKey from a hex string. */
  static fromHex(hex: string): JsPublicKey
}
export type JsSecretKey = SecretKey
export declare class SecretKey {
  /** Generate a random SecretKey */
  static random(): JsSecretKey
  /** Returns the public key corresponding to this secret key. */
  publicKey(): PublicKey
  /** Converts the secret key to big endian bytes */
  toBytes(): Uint8Array
  /** Deserialize from big endian bytes */
  static fromBytes(bytes: Uint8Array): JsSecretKey
  /** Returns the hex string representation of the secret key. */
  toHex(): string
  /** Creates a new SecretKey from a hex string. */
  static fromHex(hex: string): JsSecretKey
}
export type JsGraphEntry = GraphEntry
export declare class GraphEntry {
  /** Create a new graph entry, signing it with the provided secret key. */
  constructor(owner: SecretKey, parents: Array<PublicKey>, content: Uint8Array, descendants: Array<[PublicKey, Uint8Array]>)
  /** Create a new graph entry with the signature already calculated. */
  static newWithSignature(owner: PublicKey, parents: Array<PublicKey>, content: Uint8Array, descendants: Array<[PublicKey, Uint8Array]>, signature: Uint8Array): JsGraphEntry
  /** Get the address of the graph entry */
  address(): GraphEntryAddress
  /** Get the owner of the graph entry */
  owner(): PublicKey
  /** Get the parents of the graph entry */
  parents(): Array<PublicKey>
  /** Get the content of the graph entry */
  content(): Buffer
  /** Get the descendants of the graph entry */
  descendants(): Array<GraphEntryDescendant>
  /** Get the bytes that were signed for this graph entry */
  bytesForSignature(): Buffer
  /** Verifies if the graph entry has a valid signature */
  verifySignature(): boolean
  /** Size of the graph entry */
  size(): bigint
  get signature(): Uint8Array
  /** Returns true if the graph entry is too big */
  isTooBig(): boolean
}
export type JsPointer = Pointer
export declare class Pointer {
  /**
   * Create a new pointer, signing it with the provided secret key.
   * This pointer would be stored on the network at the provided key's public key.
   * There can only be one pointer at a time at the same address (one per key).
   */
  constructor(owner: SecretKey, counter: number, target: JsPointerTarget)
  /** Get the address of the pointer */
  address(): JsPointerAddress
  /** Get the owner of the pointer */
  owner(): PublicKey
  /** Get the target of the pointer */
  target(): JsPointerTarget
  /** Get the bytes that were signed for this pointer */
  bytesForSignature(): Buffer
  /** Get the xorname of the pointer target */
  xorname(): XorName
  /**
   * Get the counter of the pointer, the higher the counter, the more recent the pointer is
   * Similarly to counter CRDTs only the latest version (highest counter) of the pointer is kept on the network
   */
  counter(): number
  /** Verifies if the pointer has a valid signature */
  verifySignature(): boolean
  /** Size of the pointer */
  static size(): bigint
}
export type JsPointerTarget = PointerTarget
export declare class PointerTarget {
  /** Returns the xorname of the target */
  xorname(): XorName
  /** Returns the hex string representation of the target */
  toHex(): string
  /** Creates a new PointerTarget from a ChunkAddress */
  static ChunkAddress(addr: ChunkAddress): JsPointerTarget
  /** Creates a new PointerTarget from a GraphEntryAddress */
  static GraphEntryAddress(addr: GraphEntryAddress): JsPointerTarget
  /** Creates a new PointerTarget from a PointerAddress */
  static PointerAddress(addr: JsPointerAddress): JsPointerTarget
  /** Creates a new PointerTarget from a ScratchpadAddress */
  static ScratchpadAddress(addr: JsScratchpadAddress): JsPointerTarget
}
export type JsPointerAddress = PointerAddress
export declare class PointerAddress {
  /** Creates a new PointerAddress. */
  constructor(owner: PublicKey)
  /**
   * Return the network name of the pointer.
   * This is used to locate the pointer on the network.
   */
  xorname(): XorName
  /** Return the owner. */
  owner(): PublicKey
  /** Serialize this PointerAddress into a hex-encoded string. */
  toHex(): string
  /** Parse a hex-encoded string into a PointerAddress. */
  static fromHex(hex: string): JsPointerAddress
}
export type JsScratchpad = Scratchpad
export declare class Scratchpad {
  /** Create a new scratchpad, signing it with the provided secret key. */
  constructor(owner: SecretKey, dataEncoding: bigint, data: Buffer, counter: bigint)
  /** Get the address of the scratchpad */
  address(): JsScratchpadAddress
  /** Get the owner of the scratchpad */
  owner(): PublicKey
  /** Get the data encoding (content type) of the scratchpad */
  dataEncoding(): bigint
  /** Decrypt the data of the scratchpad */
  decryptData(key: SecretKey): Buffer
  /** Get the counter of the scratchpad */
  counter(): bigint
  /** Verify the signature of the scratchpad */
  verifySignature(): boolean
}
export type JsScratchpadAddress = ScratchpadAddress
export declare class ScratchpadAddress {
  /** Creates a new ScratchpadAddress. */
  constructor(owner: PublicKey)
  /**
   * Return the network name of the scratchpad.
   * This is used to locate the scratchpad on the network.
   */
  xorname(): XorName
  /** Return the owner. */
  owner(): PublicKey
  /** Serialize this ScratchpadAddress into a hex-encoded string. */
  toHex(): string
  /** Parse a hex-encoded string into a ScratchpadAddress. */
  static fromHex(hex: string): JsScratchpadAddress
}
export type JsDataMapChunk = DataMapChunk
export declare class DataMapChunk { }
export type JsPrivateArchiveDataMap = PrivateArchiveDataMap
export declare class PrivateArchiveDataMap {
  /** Serialize this PrivateArchiveDataMap into a hex-encoded string. */
  toHex(): string
  /** Parse a hex-encoded string into a PrivateArchiveDataMap. */
  static fromHex(hex: string): JsPrivateArchiveDataMap
}
export type JsPrivateArchive = PrivateArchive
export declare class PrivateArchive {
  /** Create a new empty local archive */
  constructor()
  /** Add a file to a local archive */
  addFile(path: string, dataMap: DataMapChunk, metadata: JsMetadata): void
  /** Rename a file in an archive */
  renameFile(oldPath: string, newPath: string): void
  /** List all files in the archive with their metadata */
  files(): Array<ArchiveFile>
  /** List all data maps of the files in the archive */
  dataMaps(): Array<DataMapChunk>
  /** Convert the archive to bytes */
  toBytes(): Buffer
  /** Create an archive from bytes */
  static fromBytes(data: Buffer): JsPrivateArchive
  /** Merge with another archive */
  merge(other: PrivateArchive): void
}
export type JsVaultSecretKey = VaultSecretKey
export declare class VaultSecretKey { }
export type JsUserData = UserData
export declare class UserData { }
export type JsVaultContentType = VaultContentType
export declare class VaultContentType { }
export type JsMetadata = Metadata
/** File metadata */
export declare class Metadata {
  /** Create new metadata with current timestamp and specified size */
  constructor(size: bigint)
  /** Create new metadata with all custom fields */
  static withCustomFields(created: bigint, modified: bigint, size: bigint, extra?: string | undefined | null): JsMetadata
  /** Get the creation timestamp */
  get created(): bigint
  /** Get the modification timestamp */
  get modified(): bigint
  /** Get the file size */
  get size(): bigint
  /** Get the extra metadata */
  get extra(): string | null
}
export type JsRegisterAddress = RegisterAddress
export declare class RegisterAddress {
  /** Creates a new RegisterAddress. */
  constructor(owner: PublicKey)
  /** Get the owner of the register */
  owner(): PublicKey
  /** Get the underlying graph root address */
  toUnderlyingGraphRoot(): GraphEntryAddress
  /** Get the underlying head pointer address */
  toUnderlyingHeadPointer(): PointerAddress
  /** Serialize this RegisterAddress into a hex-encoded string. */
  toHex(): string
  /** Parse a hex-encoded string into a RegisterAddress. */
  static fromHex(hex: string): JsRegisterAddress
}
export type JsRegisterHistory = RegisterHistory
export declare class RegisterHistory {
  constructor()
  /**
   * Fetch and go to the next register value from the history.
   *
   * Returns null when we reached the end.
   */
  next(): Promise<Uint8Array | null>
  /** Get all the register values from the history, starting from the first to the latest entry */
  collect(): Promise<Array<Uint8Array>>
}
export type JsPublicArchive = PublicArchive
export declare class PublicArchive {
  /** Create a new empty local archive */
  constructor()
  /** Add a file to a local archive */
  addFile(path: string, dataAddr: DataAddress, metadata: Metadata): void
  /** Rename a file in an archive */
  renameFile(oldPath: string, newPath: string): void
  /** List all files in the archive with their metadata */
  files(): Array<ArchiveFile>
  /** List all data addresses of the files in the archive */
  addresses(): Array<DataAddress>
  /** Convert the archive to bytes */
  toBytes(): Buffer
  /** Create an archive from bytes */
  static fromBytes(data: Buffer): JsPublicArchive
  /** Merge with another archive */
  merge(other: PublicArchive): void
}
