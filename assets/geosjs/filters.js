"use strict";

/**
 * Constructor for filters
 *
 * @param name      {string}          Filter name
 * @param predicate {function(Entry)} Filter predicate function
 * @param enabled   {boolean}        Enabled or disabled by default
 * @param onChange  {function}        Callback fired when filter toggles
 * @constructor
 */
function Filter(name, predicate, enabled, onChange) {
    this.name = name;
    this.enabled = !!enabled;
    this.predicate = predicate;
    this.onChange = onChange;
    this.$ = null;
    this.$cnt = null;
    this.filtered = 0;
}

/**
 * Applies filtering predicate on entry, allowing or suppressing message.
 *
 * @param {Entry} entry
 */
Filter.prototype.allows = function allows(entry) {
    var result = !this.enabled || !this.predicate(entry);
    if (!result) {
        this.filtered++;
        if (this.$cnt) {
            this.$cnt.innerText = this.filtered;
        }
    }
    return result;
};

/**
 * Builds and returns DOM
 *
 * @returns {Element|jQuery|HTMLElement}
 */
Filter.prototype.getDom = function getDom() {
    if (this.$ === null) {
        var $ = document.createElement('div');

        if (this.enabled) {
            $.classList.add("active")
        }

        $.addEventListener('click', function () {
            this.enabled = !this.enabled;
            if (this.enabled) {
                $.classList.add("active")
            } else {
                $.classList.remove("active")
            }
            if (this.onChange) {
                this.onChange();
            }
        }.bind(this));

        $.innerHTML = '<i class="fa fa-filter" aria-hidden="true" title="Filters"><span class="counter">' + this.filtered + '</span></i> <span class="name">' + this.name + '</span>';
        this.$ = $;
        this.$cnt = $.querySelector('span.counter');
    }
    return this.$;
};

// TODO
filters.push(new Filter("Trace", function (e) {
    return e.getLevel() === "trace"
}, true));
filters.push(new Filter("Debug", function (e) {
    return e.getLevel() === "debug"
}));
filters.push(new Filter("Info", function (e) {
    return e.getLevel() === "info"
}));
filters.push(new Filter("Only route", function (e) {
    return !(e.data && e.data.pattern && e.data.pattern === "Incoming RPC request to :route");
}));

if (window.GEOS) {
    window.GEOS._filters = filters;
}