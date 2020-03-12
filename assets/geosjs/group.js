"use strict";

window.Group = (function () {
    var indexGroup = 1;

    function initDom(group) {
        var $ = document.createElement('div');
        $.setAttribute('index', group.index);
        $.classList.add("group");
        $.innerHTML = '<div class="header">' +
            '<span class="time last"></span>' +
            '<span class="commands"><i class="fa fa-ban skipper" aria-hidden="true" title="Ignore group"></i><i class="fa fa-eraser clearer" aria-hidden="true" title="Erase messages"></i><i class="fa fa-exchange uml" aria-hidden="true" title="Render UML"></i></span>' +
            '<span class="entries" title="Show logs in group"><span class="msg">' + group.count.msg + '</span>|<span class="err">' + group.count.err + '</span>|<span class="skip">' + group.count.skip + '</span></span>' +
            '<span class="title">' + group.label + '</span>' +
            '<span class="app">' + Array.from(group.applicationName).join() + '</span>' +
            '<span class="tail"></span>' +
            '</div><div class="unfold"></div><div class="uml"></div>';

        group.$ = $;
        group.$entries = $.querySelector(".entries");
        group.$cntMsg = $.querySelector(".entries > .msg");
        group.$cntErr = $.querySelector(".entries > .err");
        group.$cntSkip = $.querySelector(".entries > .skip");
        group.$app = $.querySelector(".header > .app");
        group.$time = $.querySelector(".header > .last");
        group.$unfold = $.querySelector(".unfold");
        group.$uml = $.querySelector("div.uml");
        group.$tail = $.querySelector(".header > .tail");

        var $skip = $.querySelector('.commands .skipper');
        $skip.addEventListener('click', function () {
            if (group.skip) {
                $skip.classList.remove('active');
            } else {
                $skip.classList.add('active');
            }

            group.skip = !group.skip;
        }.bind(group));

        $.querySelector('.commands .clearer').addEventListener('click', group.clear.bind(group));

        var $time = $.querySelector('.time');
        $time.addEventListener('click', function () {
            group.open = !group.open;
            if (group.open) {
                $time.parentNode.parentNode.classList.add('selected');
                // Current state - is open, rendering
                group.items.forEach(function (entry) {
                    group.$unfold.appendChild(entry.getDom());
                }, group);
            } else {
                $time.parentNode.parentNode.classList.remove('selected');
                // Current state - closed, removing rendered items
                while (group.$unfold.hasChildNodes()) {
                    group.$unfold.removeChild(group.$unfold.firstChild);
                }
            }
        }.bind(group));

        $.querySelector(".commands .uml").addEventListener('click', function () {
            group.uml = !group.uml;
            if (group.uml) {
                group.$.querySelector(".commands .uml").classList.add('active');
                group.generateLoggerSequenceUML().forEach(function (o) {
                    var $ = document.createElement('div');
                    $.innerText = o;
                    group.$uml.appendChild($);
                }.bind(group));
            } else {
                group.$.querySelector(".commands .uml").classList.remove('active');
                while (group.$uml.hasChildNodes()) {
                    group.$uml.removeChild(group.$uml.firstChild);
                }
            }
        }.bind(group));
    }

    /**
     * Log entries group constructor
     *
     * @param {string} label of the group
     * @constructor
     */
    function Group(label) {
        this.index = indexGroup++;
        this.label = label;
        this.applicationName = new Set();
        this.count = {msg: 0, err: 0, skip: 0};
        this.limit = 1000; // Messages limit within single group.
        this.items = [];
        this.open = false; // Open or folded mode
        this.uml = false; // Open or closed UML
        this.skip = false; // Skip appending
        this.$ = null;
        this.$app = null;
        this.$entries = null;
        this.$cntMsg = null;
        this.$cntErr = null;
        this.$cntSkip = null;
        this.$time = null;
        this.$unfold = null;
        this.$uml = null;
        this.$tail = null;

        initDom(this);
    }

    /**
     * Adds new entry to the group
     *
     * @param {Entry} entry
     */
    Group.prototype.add = function add(entry) {
        if ((this.skip && this.items.length > 0) || this.items.length > this.limit) {
            this.count.skip++;
        } else {
            this.items.push(entry);
            this.count.msg++;
        }

        if (entry.isError()) {
            this.count.err++;
            if (!this.$entries.classList.contains('hasErrors')) {
                this.$entries.classList.add('hasErrors')
            }
        }
        this.$cntMsg.innerText = this.count.msg;
        this.$cntErr.innerText = this.count.err;
        this.$cntSkip.innerText = this.count.skip;
        this.$time.innerText = entry.time.toISOString().slice(11, 19);
        this.$tail.innerText = entry.getMessage();

        if (this.$ && this.open && !this.skip) {
            this.$unfold.appendChild(entry.getDom());
        }

        // Updating application
        var before = this.applicationName.size;
        if (entry.getApplicationName()) {
            this.applicationName.add(entry.getApplicationName());
            if (this.applicationName.size !== before && this.$app) {
                this.$app.innerText = Array.from(this.applicationName).join(',');
            }
        }
    };

    /**
     * Returns DOM node
     */
    Group.prototype.getDom = function getDom() {
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
                    if (list[list.length - 1] === current + '->' + previous + ':') {
                        list[list.length - 1] = current + '<->' + previous + ':';
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

    return Group;
})();
