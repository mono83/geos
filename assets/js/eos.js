define(
    ['underscore', 'eventemitter', 'inherits', 'sha256', 'eoslogentry', 'eoskey', 'eosloggroup'],
    function(_, emitter, inherits, sha, EosLogEntry, EosKey, EosLogGroup)
{

    /**
     * List of tags
     *
     * @constructor
     */
    function EosTagPool () {
        this._pool = [];
        this._map  = {};
    }

    /**
     * Adds new tag(s) to pool
     *
     * @param {string|string[]} tag
     * @return {boolean} Returns true if tag added, false (already exists) otherwise
     */
    EosTagPool.prototype.add = function add(tag) {
        if (!tag) {
            return false;
        }

        if (_.isArray(tag)) {
            var added = false;
            for (var i=0; i < tag.length; i++) {
                added = this.add(tag[i]) || added;
            }
            return added;
        }

        if (this._map.hasOwnProperty(tag)) {
            return false;
        }

        // Adding tag, which is enabled by default
        this._map[tag] = true;
        this._pool.push(tag);
        this._pool.sort();
        return true;
    };

    EosTagPool.prototype.getList = function getList() {
        return this._pool;
    };

    EosTagPool.prototype.isEnabled = function isEnabled(tag) {
        return tag && this._map.hasOwnProperty(tag) && this._map[tag];
    };

    EosTagPool.prototype.toggle = function toggle(tag) {
        if (tag && this._map.hasOwnProperty(tag)) {
            this._map[tag] = !this._map[tag];
        }
    };



    /**
     * Main Eos service
     *
     * @constructor
     */
    function Eos() {
        emitter.constructor.call(this);

        this.socket    = null;
        this.connected = false;
        this.groups    = {};
        this._tagpool  = new EosTagPool();
    }
    inherits(Eos, emitter);

    /**
     * Connects to websocket server
     *
     * @param {string} server
     * @param {*}      port
     * @param {string} tag
     * @param {string} realm
     * @param {string} secret
     */
    Eos.prototype.connect = function connect(server, port, tag, realm, secret) {
        this.disconnect();
        this.realm  = realm;
        this.secret = secret;
        this.tag    = tag;

        var uri  = "ws://" + server + ":" + port;
        var self = this;
        this.emit("log", "Connecting to " + uri);
        this.socket = new WebSocket(uri);
        this.socket.onopen  = function onopen(){
            self.connected = true;
            self.logSelf("Successfully connected to " + uri);
            self.logSelf("Sending credentials");
        };
        this.socket.onerror = function onerror(){
            self.logSelf("Connection failed");
            self.emit("connectionError");
        };
        this.socket.onclose   = this.disconnect.bind(this);
        this.socket.onmessage = this.onWebsocketMessage.bind(this);
    };

    /**
     * Returns array of data used on handshaking
     */
    Eos.prototype.getHandshakePacket = function getHandShakePacket()
    {
        var nonce   = new Date();
        var payload = this.tag;
        var hash    = sha.SHA256(nonce + payload + this.secret);

        return ["subscribe", this.realm , nonce, payload, hash];
    };

    /**
     * Utility function to log health information
     *
     * @param {string} msg
     * @param {object=} object
     */
    Eos.prototype.logSelf = function logSelf(msg, object) {
        this.emit("log", msg);
        this.addLogEntry(EosLogEntry.internalLog(msg));
    };

    /**
     * Disconnects from server
     */
    Eos.prototype.disconnect = function disconnect() {
        this.logSelf("Disconnecting");
        this.emit("disconnect");
        if (this.connected) {
            this.connected = false;
            this.socket.close();
            this.socket = null;
        }
    };

    /**
     * Function, called on incoming packet
     */
    Eos.prototype.onWebsocketMessage = function onWebsocketMessage(packet) {
        this.emit("debug", "Received packet");
        this.emit("debug", packet);

        var chunks = packet.data.split("\n");
        switch (chunks[0]) {
            case "uuid":
                return this.onPacketUuid(chunks.slice(1));
            case "log":
                return this.onPacketLog(chunks.slice(1));
            case "error":
                return this.onPacketError(chunks.slice(1));
            case "connected":
                this.emit("connected");
                return null;
            default:
                this.emit("error", "Unknown packet received");
                return null;
        }
    };

    /**
     * Function, invoked when UUID operation received from server
     * In common, it's auth request
     *
     * @param packet
     */
    Eos.prototype.onPacketUuid = function onPacketUuid(packet) {
        this.uuid = packet[0];
        this.logSelf("Auth UUID is " + this.uuid);
        this.socket.send(this.getHandshakePacket().join("\n"));
    };

    /**
     * Function, invoked when error received
     *
     * @param packet
     */
    Eos.prototype.onPacketError = function onPacketError(packet) {
        this.logSelf("Error: " + packet[0]);
    };

    /**
     * Function, invoked on incoming LOG entry
     *
     * @param {string[]} packet
     * @return {EosLogEntry}
     */
    Eos.prototype.onPacketLog = function onPacketLog(packet) {
        var key  = EosKey.parse(packet.shift());
        var data = packet.join("\n");

        var entry = EosLogEntry.parse(key, data);
        this.emit("debug", entry);
        this.addLogEntry(entry);

        return entry;
    };

    /**
     * Adds new log entry to corresponding group
     *
     * @param {EosLogEntry} entry
     */
    Eos.prototype.addLogEntry = function addLogEntry(entry) {
        var id    = entry.tracking;
        var group = this.groups[id];
        if (!group) {
            group = new EosLogGroup(id);
            this.groups[id] = group;
        }

        group.add(entry);
        entry.index = group.count;
        this.emit("newLogEntry", {entry: entry, group: group});

        if (entry.key.tags.length > 0) {
            if (this._tagpool.add(entry.key.tags)) {
                this.emit("newTag", this._tagpool);
            }
        }
    };

    return new Eos();
});