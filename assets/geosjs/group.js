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
    this.uml = false; // Open or closed UML
    this.skip = false; // Skip appending
    this.$ = null;
    this.$app = null;
    this.$cntMsg = null;
    this.$cntErr = null;
    this.$cntSkip = null;
    this.$time = null;
    this.$unfold = null;
    this.$uml = null;

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
    if (entry.getApplicationName()) {
        this.applicationName.add(entry.getApplicationName());
        if (this.applicationName.size !== before && this.$app) {
            this.$app.innerText = Array.from(this.applicationName).join();
        }
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
            '<span class="app">' + Array.from(this.applicationName).join() + '</span>' +
            '<span class="title">' + this.rayId + '</span>' +
            '<span class="box toggle entries" title="Show logs in group"><span class="msg">' + this.count.msg + '</span>|<span class="err">' + this.count.err + '</span>|<span class="skip">' + this.count.skip + '</span></span>' +
            '<span class="box toggle uml" title="Show UML sequence">uml</span>' +
            '<span class="box toggle skipper" title="Ignore new messages">skip</span>' +
            '<span class="box toggle clearer" title="Clear group">clear</span>' +
            '</div><div class="unfold"></div><div class="uml"></div>';

        this.$ = $;
        this.$cntMsg = $.querySelector(".entries > .msg");
        this.$cntErr = $.querySelector(".entries > .err");
        this.$cntSkip = $.querySelector(".entries > .skip");
        this.$app = $.querySelector(".header > .app");
        this.$time = $.querySelector(".header > .last");
        this.$unfold = $.querySelector(".unfold");
        this.$uml = $.querySelector("div.uml");

        var $skip = $.querySelector('.skipper');
        $skip.addEventListener('click', function () {
            if (this.skip) {
                $skip.classList.remove('active');
            } else {
                $skip.classList.add('active');
            }

            this.skip = !this.skip;
        }.bind(this));

        $.querySelector('.clearer').addEventListener('click', this.clear.bind(this));

        this.$cntMsg.parentNode.addEventListener('click', function () {
            this.open = !this.open;
            if (this.open) {
                this.$cntSkip.parentNode.classList.add('active');
                // Current state - is open, rendering
                this.items.forEach(function (entry) {
                    this.$unfold.appendChild(entry.getDom());
                }, this);
            } else {
                this.$cntSkip.parentNode.classList.remove('active');
                // Current state - closed, removing rendered items
                while (this.$unfold.hasChildNodes()) {
                    this.$unfold.removeChild(this.$unfold.firstChild);
                }
            }
        }.bind(this));

        $.querySelector(".header .uml").addEventListener('click', function () {
            this.uml = !this.uml;
            if (this.uml) {
                this.$.querySelector(".header .uml").classList.add('active');
                this.generateLoggerSequenceUML().forEach(function (o) {
                    var $ = document.createElement('div');
                    $.innerText = o;
                    this.$uml.appendChild($);
                }.bind(this));
            } else {
                this.$.querySelector(".header .uml").classList.remove('active');
                while (this.$uml.hasChildNodes()) {
                    this.$uml.removeChild(this.$uml.firstChild);
                }
            }
        }.bind(this));
    }

    return this.$;
};

/**
 * Clears group data
 */
Group.prototype.clear = function () {
    this.items = [];
    this.count = {msg: 0, err: 0, skip: 0};

    if (this.$unfold) {
        while (this.$unfold.hasChildNodes()) {
            this.$unfold.removeChild(this.$unfold.firstChild);
        }
    }

    this.add(new Entry({message: "Group cleared"}));
};

/**
 * Destroys group - data and DOM
 */
Group.prototype.destroy = function () {
    this.clear();
    if (this.$) {
        this.$.remove();
    }
};

/**
 * Generates sequence diagram UML
 */
Group.prototype.generateLoggerSequenceUML = function generateLoggerSequenceUML() {
    var previous = null;
    var list = [
        'Title: Sequence diagram '
    ];
    this.items.forEach(function (o) {
        var current = o.getLoggerShort();
        if (current !== previous) {
            if (previous) {
                if (list[list.length-1] === current + '->' + previous + ':') {
                    list[list.length-1] = current + '<->' + previous + ':';
                } else {
                    list.push(previous + '->' + current + ':');
                }
            }
            previous = current;
        }
    });

    if (list.length === 1) {
        list.push('# No multiple loggers found')
    }

    return list;
};