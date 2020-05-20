"use strict";

var indexEntry = 1;

/**
 * Constructor for log entry
 *
 * @constructor
 */
function Entry(data) {
    this.index = indexEntry++;
    this.data = tryGelf(data || {});
    this.$ = null;
    this.open = false;
    if (data["event-time"]) {
        this.time = new Date(data["event-time"]);
    } else {
        this.time = new Date();
    }
}

/**
 * @returns {string|*|string} RayID of log entry
 */
Entry.prototype.getRayId = function getRayId() {
    return this.data.rayId || this.data["sessionId"] || this.data["session-id"] || "--none--";
};
/**
 * @returns {string} Name of object, that emits this event
 */
Entry.prototype.getLogger = function getLogger() {
    return this.data.object || "--none--";
};
/**
 * @returns {string} Short name of object, that emits this event
 */
Entry.prototype.getLoggerShort = function getLoggerShort() {
    let logger = this.getLogger();
    if (logger.indexOf('\\') !== -1) {
        logger = logger.replace(/\\+/g, '.')
    }
    if (logger.indexOf('.') !== -1) {
        let chunks = logger.split('.');
        logger = chunks.map(function (o, i) {
            return i === chunks.length - 1
                ? o
                : o[0].toLowerCase();
        }).join('.');
    }

    return logger;
};
/**
 * @returns {string|*|string} Application name for entry
 */
Entry.prototype.getApplicationName = function getApplicationName() {
    return this.data.app || this.data.serviceName || ""
};
/**
 * @returns {string} Message logging level
 */
Entry.prototype.getLevel = function getLevel() {
    let lvl = (this.data["log-level"] || this.data.level || "info").toLowerCase();
    if (lvl === "warn") {
        lvl = "warning";
    }

    return lvl;
};
/**
 * @returns {boolean} True if logging level points to error
 */
Entry.prototype.isError = function isError() {
    let lvl = this.getLevel();
    return lvl === "error" || lvl === "alert" || lvl === "critical" || lvl === "emergency";
};
/**
 * @returns {string} Error message
 */
Entry.prototype.getMessage = function getMessage() {
    return this.data.hmessage || this.data.message || this.data.pattern || "--none--";
};
/**
 * @returns {Element|HTMLElement} DOM container for entry
 */
Entry.prototype.getDom = function getDom() {
    if (this.$ === null) {
        let $ = document.createElement('div');
        $.setAttribute('index', this.index);
        $.classList.add("entry");
        $.classList.add("entry-" + this.getLevel());
        $.innerHTML = '<div class="line">' +
            '<span class="time">' + this.time.toISOString().slice(14, 19) + '</span>' +
            '<span class="message">' + this.getMessage() + '</span>' +
            '<span class="app">' + this.getApplicationName() + '</span>' +
            '</div><div class="details unfold"></div>';


        this.$ = $;
        let $unfold = $.querySelector(".unfold");
        let self = this;
        $.querySelector('.line .time').addEventListener('click', function () {
            self.open = !self.open;
            if (self.open) {
                // Current state - open, rendering keys

                // Preparing data to render
                let cloned = {};
                Object.keys(self.data).forEach(function (name) {
                    cloned[name] = self.data[name];
                });
                let extra = {};
                if (cloned.exception
                    && typeof cloned.exception === "object"
                    && !Array.isArray(cloned.exception)
                    && typeof cloned.exception.code === "number"
                    && typeof cloned.exception.message === "string"
                ) {
                    extra.exception = cloned.exception;
                    delete cloned.exception;
                }

                // Printing to console for copy-paste
                console.log(JSON.stringify(self.data));
                console.log(self.data);

                // Rendering HTML
                let html = '';
                html += '<div class="table">';
                Object.keys(cloned).forEach(function (name) {
                    var value = cloned[name];
                    if (Array.isArray(value) && value.length === 1) {
                        value = value[0];
                    }

                    if (Array.isArray(value)) {
                        html += '<div><span class="var-name">' + name + '</span><span class="var-value">';
                        value.forEach(function (v) {
                            html += v + '<br/>';
                        });
                        html += '</span></div>'
                    } else {
                        html += '<div><span class="var-name">' + name + '</span><span class="var-value">' + value + '</span></div>';
                    }
                });
                html += '</div>';
                // Additional section - for exceptions
                if (extra.exception) {
                    html += '<div class="exception">';
                    html += '<div class="header">Exception data</div>';
                    html += '<div><span class="code">' + extra.exception.code + '</span><span class="message">' + extra.exception.message + '</span></div>';
                    if (Array.isArray(extra.exception.trace)) {
                        html += '<div class="trace">';
                        extra.exception.trace.forEach(function (o) {
                            html += '<div>';
                            if (o.file) {
                                html += '<span class="file">' + o.file + "</span>";
                            }
                            if (o.line) {
                                html += '<span class="line">' + o.line + "</span>";
                            }
                            html += '</div>';
                        });
                        html += '</div>';
                    }
                    html += '</div>'
                }
                $unfold.innerHTML = html;
                $unfold.style.display = 'table';
            } else {
                // Current state - closed, removing rendered items
                while ($unfold.hasChildNodes()) {
                    $unfold.removeChild($unfold.firstChild);
                }
                $unfold.style.display = 'none';
            }
        });
    }

    return this.$;
};

/**
 * Parses incoming data and if GELF signature recognized - converts
 * data from GELF to standard logstash format.
 *
 * @param data Incoming data
 * @returns {*}
 */
function tryGelf(data) {
    if (data && data.host && data.level && data.short_message && data.version) {
        // Seems like data contains GELF-specific fields, assuming that this is GELF message
        data.object = data.host;
        data.pattern = data.short_message;
        data.message = data.full_message;

        switch (data.level) {
            case 2:
                data['log-level'] = 'alert';
                break;
            case 3:
                data['log-level'] = 'error';
                break;
            case 4:
                data['log-level'] = 'warn';
                break;
            case 6:
                data['log-level'] = 'info';
                break;
            default:
                data['log-level'] = 'debug';
                break;
        }

        // Copying underscore values to top level
        for (let [key, value] of Object.entries(data)) {
            if (key.startsWith('_')) {
                data[key.substring(1)] = value;
            }
        }
    }

    return data;
}