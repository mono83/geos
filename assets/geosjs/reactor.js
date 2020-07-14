"use strict";

function Reactor() {
    this._reserved = "geos";
    this._socket = null;
    this._groups = {};
    this._filters = [];
    this._registeredDynamicFilters = [];
    this._mustBeConnected = false;
    this.initialTitle = null;
    this.total = 0;
    this.filtersShown = false;
    this.$logs = null;
    this.$filters = null;
    this.$buttonConnect = null;
    this.$buttonClear = null;
    this.$buttonFilters = null;
    this.updateTitleTimer = null;
}

/**
 * @param {Entry} pkt
 */
Reactor.prototype.emit = function emit(pkt) {
    if (pkt.getApplicationName() !== "geos") {
        // Adding filter by Application name
        if (!this._registeredDynamicFilters.includes(pkt.getApplicationName())) {
            var filterName = "[App] " + pkt.getApplicationName();

            // Adding filter to window
            this.addFilter(filterName, e => e.getApplicationName() === pkt.getApplicationName(), false);

            // Register dynamic filter
            this._registeredDynamicFilters.push(pkt.getApplicationName());

            console.info("Registered new filter " + filterName)
        }

        // Applying filtering
        if (!this.isAllowedByFilters(pkt)) {
            return;
        }
    }
    var name = pkt.getRayId();
    this.total++;
    if (!this._groups.hasOwnProperty(name)) {
        this._groups[name] = new Group(name, this.isAllowedByFilters.bind(this));
        this.$logs.appendChild(this._groups[name].getDom());
    }
    this._groups[name].add(pkt);

    this.scheduleUpdateTitle();
};

/**
 * Wrapper to prevent too frequent title update, because it can cause GUI freeze
 */
Reactor.prototype.scheduleUpdateTitle = function() {
    if (this.updateTitleTimer !== null) {
        return;
    }

    var self = this;
    this.updateTitleTimer = setTimeout(function() {
        window.document.title = '[' + self.total + '] ' + self.initialTitle;
        self.updateTitleTimer = null;
    }, 250);
}

Reactor.prototype.addFilter = function(name, predicate, enabled) {
    this._filters.push(new Filter(name, predicate, enabled, this.onFilterChange.bind(this)));
};

Reactor.prototype.onFilterChange = function() {
    for (var group of Object.values(this._groups)) {
        group.onFilterChange();
    }
};

Reactor.prototype.isAllowedByFilters = function(pkt) {
    for (var i = 0; i < this._filters.length; i++) {
        if (!this._filters[i].allows(pkt)) {
            return false;
        }
    }
    return true;
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
        self.$buttonConnect.classList.remove('inactive');
        self.$buttonConnect.classList.add('active');
        self.debug("Connection to backend established");
        self._socket = socket;
        self._mustBeConnected = true;
    };
    socket.onerror = function onerror() {
        self.debug("Error");
        socket.close();
    };
    socket.onclose = function onclose() {
        self.$buttonConnect.classList.remove('active');
        self.$buttonConnect.classList.add('inactive');
        self.debug("Connection closed");
        self._socket = null;
        setTimeout(self.reconnect.bind(self), 2000)
    };
    socket.onmessage = function onmessage(raw) {
        self.emit(new Entry(JSON.parse(raw.data)))
    };
};

/**
 * Performs reconnection sequence
 */
Reactor.prototype.reconnect = function reconnect() {
    if (!this._mustBeConnected || this._socket !== null) {
        return;
    }

    this.connect();
};

/**
 * Initializes reactor (god object)
 * @param {boolean} debugMode
 */
Reactor.prototype.init = function init(debugMode) {
    this.initialTitle = window.document.title;

    this.$logs = document.getElementById('logWindow');
    this.$filters = document.getElementById('filtersWindow');
    this.$buttonConnect = document.getElementById('connectBtn');
    this.$buttonClear = document.getElementById('clearBtn');
    this.$buttonFilters = document.getElementById('filtersBtn');
    this.$topFrame = document.getElementById('topFrame');

    this.addFilter("Trace", e => e.getLevel() === "trace", true);
    this.addFilter("Debug", e => e.getLevel() === "debug", false);
    this.addFilter("Info", e => e.getLevel() === "info", false);
    this.addFilter(
        "Only route",
        e => !(e.data && e.data.pattern && e.data.pattern === "Incoming RPC request to :route"),
        false
    );

    var self = this;
    this.$buttonConnect.addEventListener('click', function () {
        if (self._socket !== null) {
            self.debug("Manual disconnect requested");
            self.$buttonConnect.classList.remove('active');
            self.$buttonConnect.classList.add('inactive');
            self._socket.close();
            self._socket = null;
            self._mustBeConnected = false;
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
        self.total = 0;
    });

    this.$buttonFilters.addEventListener('click', this.toggleDisplayFilters.bind(this));

    this.connect();
    if (debugMode) {
        this.fixture();
        window.setTimeout(function () {
            var $ = document.querySelector('div.group[index="2"]');
            $.querySelector('.time').click();
            $.querySelector('.unfold .entry[index="4"] .time').click();
            $.querySelector('.unfold .entry[index="9"] .time').click();

            this.$buttonFilters.click();
        }.bind(this), 100);
    }
};

/**
 * Shows or hides filters
 */
Reactor.prototype.toggleDisplayFilters = function toggleDisplayFilters() {
    this.filtersShown = !this.filtersShown;
    if (this.filtersShown) {
        for (var i = 0; i < this._filters.length; i++) {
            this.$filters.appendChild(this._filters[i].getDom());
        }
        this.$filters.classList.remove('hidden');
        this.$logs.style.paddingTop = this.$topFrame.offsetHeight + 2 + this.$filters.offsetHeight;
    } else {
        this.$filters.classList.add('hidden');
        this.$logs.style.paddingTop = this.$topFrame.offsetHeight + 2;
        while (this.$filters.hasChildNodes()) {
            this.$filters.removeChild(this.$filters.firstChild);
        }
    }
};

/**
 * Rendering test
 */
Reactor.prototype.fixture = function fixture() {
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "trace", "message": "This is trace message"}));
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "debug", "message": "This is debug message"}));
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "info", "message": "This is info message"}));
    this.emit(new Entry({
        "rayId": "render",
        "app": "test",
        "log-level": "warning",
        "message": "This is warning message"
    }));
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "error", "message": "This is error message"}));
    this.emit(new Entry({"rayId": "render", "app": "test", "log-level": "alert", "message": "This is alert message"}));
    this.emit(new Entry({
        "rayId": "render",
        "app": "test",
        "log-level": "critical",
        "message": "This is critical message"
    }));
    this.emit(new Entry({
        "rayId": "render",
        "app": "foo",
        "log-level": "emergency",
        "message": "This is emergency message",
        "exception": {
            "code": 12,
            "message": "Some kind of exception message",
            "trace": [
                {file: "action.php", line: 300},
                {file: "index.php", line: 4}
            ]
        }
    }));

    var now = new Date().getTime();

    this.emit(new Entry({
        "rayId": "render",
        "app": "test",
        "log-level": "debug",
        "message": "Early event 2",
        "event-time": new Date(now - 3000)
    }));

    this.emit(new Entry({
        "rayId": "render",
        "app": "test",
        "log-level": "info",
        "message": "Early event 1",
        "event-time": new Date(now - 4000)
    }));

    this.emit(new Entry({
        "rayId": "render",
        "app": "test",
        "log-level": "debug",
        "message": "Early event 3",
        "event-time": new Date(now - 2000)
    }));

    var self = this;
    var index = 0;
    return;
    window.setInterval(function () {
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