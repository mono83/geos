define(['underscore'], function(_) {

    /**
     * Constructor of Eos log entries group
     *
     * @param {string} id
     * @constructor
     */
    function EosLogGroup(id) {
        this.id      = id;
        this.items   = [];
        this.exposed = {};
        this.count   = 0;
        this.uuid    = null;
        this.realm   = null;
        this.secret  = null;

        this.sharedTags = null;

        this.sqlCount    = 0;
        this.errorsCount = 0;
        this.performance = 0;

        this.firstReceivedAt = new Date();
        this.lastReceivedAt = new Date();
    }

    /**
     * Adds new log entry to group
     *
     * @param {EosLogEntry} entry
     */
    EosLogGroup.prototype.add = function add(entry) {
        this.count++;
        this.lastReceivedAt = entry.receivedAt;
        if (entry.exception !== null) {
            this.errorsCount++;
        }
        if (entry.sql !== null) {
            this.sqlCount++;
        }
        if (entry.perf !== null) {
            this.performance += entry.perf;
        }
        if (entry.expose) {
            this.exposed[entry.expose] = true;
        }

        // Registering shared tags
        if (entry.key.tags.length > 0) {
            // Entry has tags
            if (this.sharedTags === null) {
                this.sharedTags = entry.key.tags;
            } else if (this.sharedTags.length === 0) {
                // Do nothing - intersection empty already
            } else {
                // Calculating intersection
                this.sharedTags = _.intersection(this.sharedTags, entry.key.tags);
            }
        }

        this.items.push(entry);
    };

    /**
     * Returns list of shared tags in group
     *
     * @return {string[]}
     */
    EosLogGroup.prototype.getSharedTags = function getSharedTags() {
        if (this.sharedTags) {
            return this.sharedTags;
        } else {
            return [];
        }
    };

    return EosLogGroup;
});