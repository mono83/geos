"use strict";

var indexEntry = 1;

/**
 * Constructor for log entry
 *
 * @constructor
 */
function Entry(data) {
    this.index = indexEntry++;
    this.data = data || {};
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
 * @returns {string|*|string} Application name for entry
 */
Entry.prototype.getApplicationName = function getApplicationName() {
    return this.data.app || this.data.serviceName || ""
};
Entry.prototype.getLevel = function getLevel() {
    var lvl = (this.data["log-level"] || this.data.level || "info").toLowerCase();
    if (lvl === "warn") {
        lvl = "warning";
    }

    return lvl;
};
Entry.prototype.isError = function isError() {
    var lvl = this.getLevel();
    return lvl === "error" || lvl === "alert" || lvl === "critical" || lvl === "emergency";
};
Entry.prototype.getMessage = function getMessage() {
    return this.data.hmessage || this.data.message || this.data.pattern || "--none--";
};
Entry.prototype.getDom = function getDom() {
    if (this.$ === null) {
        var $ = document.createElement('div');
        $.setAttribute('index', this.index);
        $.classList.add("entry");
        $.classList.add("entry-" + this.getLevel());
        $.innerHTML = '<div class="line">' +
            '<span class="time">' + this.time.toISOString().slice(11, 19) + '</span>' +
            '<span class="message">' + this.getMessage() + '</span>' +
            '</div><div class="details unfold"></div>';


        this.$ = $;
        var $unfold = $.querySelector(".unfold");
        var self = this;
        $.querySelector('.line .time').addEventListener('click', function () {
            self.open = !self.open;
            if (self.open) {
                // Current state - open, rendering keys
                console.log(self.data);
                var html = '';
                Object.keys(self.data).forEach(function(name){
                    var value = self.data[name];
                    if (Array.isArray(value)) {
                        html += '<div><span class="var-name">' + name + '</span><br/>';
                        value.forEach(function(v) {
                            html += '<span class="var-value">' + v + '</span><br/>';
                        });
                        html += '</div>'
                    } else {
                        html += '<div><span class="var-name">' + name + '</span><span class="var-value">' + value + '</span></div>';
                    }
                });
                $unfold.innerHTML = html;
                $unfold.style.display = 'block';
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