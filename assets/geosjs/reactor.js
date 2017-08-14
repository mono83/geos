"use strict";

function Reactor() {
    this._reserved = "geos";
    this._socket = null;
    this._groups = {};
    this.$logs = null;
    this.$buttonConnect = null;
    this.$buttonClear = null;
}

/**
 * @param {Entry} pkt
 */
Reactor.prototype.emit = function emit(pkt) {
    var name = pkt.getRayId();
    if (!this._groups.hasOwnProperty(name)) {
        this._groups[name] = new Group(pkt);
        this.$logs.appendChild(this._groups[name].getDom());
    } else {
        this._groups[name].add(pkt);
    }
};

/**
 * Emits debug event
 *
 * @param msg
 */
Reactor.prototype.debug = function debug(msg) {
    this.emit(new Entry({
        app: this._reserved,
        rayId: this._reserved,
        "log-level": "info",
        message: msg
    }));
};

/**
 * Establishes connection to websockets
 */
Reactor.prototype.connect = function connect() {
    if (this._socket !== null) {
        this.debug("Connection already established");
        return;
    }

    var uri = "ws://" + window.location.hostname + ":" + window.location.port + "/ws";
    this.debug("Attempting to establish websocket connection to " + uri);
    var socket = new WebSocket(uri);
    var self = this;
    socket.onopen = function onopen() {
        self.$buttonConnect.value = "Disconnect";
        self.debug("Connection to backend established");
        self._socket = socket;
    };
    socket.onerror = function onerror() {
        self.debug("Error");
        socket.close();
    };
    socket.onclose = function onclose() {
        self.$buttonConnect.value = "Connect";
        self.debug("Connection closed");
        self._socket = null;
    };
    socket.onmessage = function onmessage(raw) {
        self.emit(new Entry(JSON.parse(raw.data)))
    }
};

/**
 * Initializes reactor (god object)
 */
Reactor.prototype.init = function init() {
    this.$logs = document.getElementById('logWindow');
    this.$buttonConnect = document.getElementById('connectBtn');
    this.$buttonClear = document.getElementById('clearBtn');

    this.$buttonClear.value = "Clear";
    this.$buttonConnect.value = "Connect";

    var self = this;
    this.$buttonConnect.addEventListener('click', function () {
        if (self._socket !== null) {
            self.debug("Manual disconnect requested");
            self.$buttonConnect.value = "Connect";
            self._socket.close();
            self._socket = null;
        } else {
            self.connect();
        }
    });
    this.$buttonClear.addEventListener('click', function () {
        var newMap = {};
        Object.keys(self._groups).forEach(function (name) {
            var group = self._groups[name];
            if (group.rayId === self._reserved) {
                newMap[name] = group;
            } else {
                group.destroy();
            }
        });
        self._groups = newMap;
        self.debug("Output cleared");
    });

    this.connect();
    this.fixture();
};

/**
 * Rendering test
 */
Reactor.prototype.fixture = function fixture() {
    this.emit(new Entry({"rayId": "render", "app": "geos", "log-level": "trace", "message": "This is trace message"}));
    this.emit(new Entry({"rayId": "render", "app": "geos", "log-level": "debug", "message": "This is debug message"}));
    this.emit(new Entry({"rayId": "render", "app": "geos", "log-level": "info", "message": "This is info message"}));
    this.emit(new Entry({
        "rayId": "render",
        "app": "geos",
        "log-level": "warning",
        "message": "This is warning message"
    }));
    this.emit(new Entry({"rayId": "render", "app": "geos", "log-level": "error", "message": "This is error message"}));
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "alert", "message": "This is alert message"}));
    this.emit(new Entry({
        "rayId": "render",
        "app": "geos",
        "log-level": "critical",
        "message": "This is critical message"
    }));
    this.emit(new Entry({
        "rayId": "render",
        "app": "foo",
        "log-level": "emergency",
        "message": "This is emergency message"
    }));

    var self = this;
    var index = 0;
    window.setInterval(function() {
        // Emitting event at regular basis
        self.emit(new Entry({
            "rayId": "render",
            "app": "foo",
            "log-level": "info",
            "message": "Regular message #" + (index++)
        }))
    }, 500);
};

window.GEOS = new Reactor();