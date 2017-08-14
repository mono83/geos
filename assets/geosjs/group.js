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
    this.count = {msg: 0, err: 0, skip: 0};
    this.items = [];
    this.open = false; // Open or folded mode
    this.skip = false; // Skip appending
    this.$ = null;
    this.$app = null;
    this.$cntMsg = null;
    this.$cntErr = null;
    this.$cntSkip = null;
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
    if (this.skip && this.items.length > 0) {
        this.count.skip++;
    } else {
        this.items.push(entry);
        this.count.msg++;
    }

    if (entry.isError()) {
        this.count.err++;
    }
    if (this.$cntMsg) {
        this.$cntMsg.innerText = this.count.msg;
        this.$cntErr.innerText = this.count.err;
        this.$cntSkip.innerText = this.count.skip;
    }
    if (this.$time) {
        this.$time.innerText = entry.time.toISOString().slice(11, 19);
    }
    if (this.$ && this.open && !this.skip) {
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
            '<span class="box toggle entries"><span class="msg">' + this.count.msg + '</span>/<span class="err">' + this.count.err + '</span>/<span class="skip">' + this.count.skip + '</span></span>' +
            '</div><div class="unfold"></div>';

        this.$ = $;
        this.$cntMsg = $.querySelector(".entries > .msg");
        this.$cntErr = $.querySelector(".entries > .err");
        this.$cntSkip = $.querySelector(".entries > .skip");
        this.$app = $.querySelector(".header > .application");
        this.$time = $.querySelector(".header > .last");
        this.$unfold = $.querySelector(".unfold");

        this.$cntMsg.parentNode.addEventListener('click', function () {
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