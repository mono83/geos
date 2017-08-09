"use strict";

var indexGroup = 1;

/**
 * Log entries group constructor
 *
 * @param {Entry} entry
 * @constructor
 */
function Group(entry) {
    this.index = indexGroup++;
    this.rayId = entry.getRayId();
    this.applicationName = new Set();
    this.applicationName.add(entry.getApplicationName());
    this.count = 0;
    this.countErrors = 0;
    this.items = [];
    this.open = false; // Open or folded mode
    this.$ = null;
    this.$app = null;
    this.$log = null;
    this.$time = null;
    this.$unfold = null;

    this.add(entry)
}

/**
 * Adds new entry to the group
 *
 * @param {Entry} entry
 */
Group.prototype.add = function add(entry) {
    this.items.push(entry);
    this.count++;

    if (entry.isError()) {
        this.countErrors++;
    }
    if (this.$log) {
        this.$log.innerText = this.count;
        this.$logErr.innerText = this.countErrors;
    }
    if (this.$time) {
        this.$time.innerText = entry.time.toISOString().slice(11, 19);
    }
    if (this.$ && this.open) {
        this.$unfold.appendChild(entry.getDom())
    }

    // Updating application
    var before = this.applicationName.size;
    this.applicationName.add(entry.getApplicationName());
    if (this.applicationName.size !== before && this.$app) {
        this.$app.innerText = Array.from(this.applicationName).join();
    }
};

/**
 * Returns DOM node
 */
Group.prototype.getDom = function getDom() {
    if (this.$ === null) {
        var $ = document.createElement('div');
        $.setAttribute('index', this.index);
        $.classList.add("group");
        $.innerHTML = '<div class="header">' +
            '<span class="box time first">' + this.items[0].time.toISOString().slice(11, 19) + '</span>' +
            '<span class="box time last">' + this.items[0].time.toISOString().slice(11, 19) + '</span>' +
            '<span class="application">' + Array.from(this.applicationName).join() + '</span>' +
            '<span class="title">' + this.rayId + '</span>' +
            '<span class="box toggle entries">log <span class="count">' + this.count + '</span></span>' +
            '<span class="box toggle errors">err <span class="count">' + this.countErrors + '</span></span>' +
            '</div><div class="unfold"></div>';

        this.$ = $;
        this.$log = $.querySelector(".entries > .count");
        this.$logErr = $.querySelector(".errors > .count");
        this.$app = $.querySelector(".header > .application");
        this.$time = $.querySelector(".header > .last");
        this.$unfold = $.querySelector(".unfold");

        this.$log.parentNode.addEventListener('click', function () {
            this.open = !this.open;
            if (this.open) {
                // Current state - is open, rendering
                this.items.forEach(function (entry) {
                    this.$unfold.appendChild(entry.getDom());
                }, this);
            } else {
                // Current state - closed, removing rendered items
                while (this.$unfold.hasChildNodes()) {
                    this.$unfold.removeChild(this.$unfold.firstChild);
                }
            }
        }.bind(this));
    }

    return this.$;
};

Group.prototype.destroy = function () {
    if (this.$) {
        this.$.remove();
    }
};