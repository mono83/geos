define(['underscore', 'eoskey'], function(_, EosKey){

    var EosDefaultId = "--default--";
    var InternalKey  = new EosKey("log", "eos");

    function EosLogEntry(data) {
        this.index      = 1;
        this.receivedAt = new Date();

        this.key       = data.key ? data.key : null;
        this.message   = data.message ? data.message : null;
        this.tracking  = data.tracking ? data.tracking : EosDefaultId;
        this.exception = data.exception && _.isObject(data.exception) ? data.exception : null;
        this.sql       = data.sql ? data.sql : null;
        this.perf      = data.perf ? data.perf : null;
        this.expose    = data.expose ? data.expose : null;
        this.vars      = data.vars && _.isObject(data.vars) ? data.vars : {};

        if (this.exception) {
            this.exception.message = this.exception.message ? this.exception.message : null;
            this.exception.code    = this.exception.code ? this.exception.code : 0;
            this.exception.trace   = this.exception.trace && _.isArray(this.exception.trace) ? this.exception.trace : [];
            this.exception.file    = this.exception.file ? this.exception.file : null;
            this.exception.line    = this.exception.line ? this.exception.line : 0;
        }

        if (this.tracking.indexOf(".") >= 0) {
            this.tracking = this.tracking.replace(/\./g, '-');
        }
    }

    EosLogEntry.parse = function parse(key, payload) {
        var parsed = {key: key};
        if (payload && _.isString(payload)) {
            try {
                var struct = JSON.parse(payload);
                parsed.message   = struct['message'];
                parsed.tracking  = struct['eos-id'];
                parsed.exception = struct['exception'];
                parsed.sql       = struct['sql'];
                parsed.perf      = struct['time'];
                parsed.expose    = struct['expose'];

                delete struct['message'];
                delete struct['eos-id'];
                delete struct['exception'];
                delete struct['sql'];
                delete struct['time'];
                delete struct['expose'];

                parsed.vars = struct;

            } catch (e) {
                parsed.message = payload;
            }
        }

        return new EosLogEntry(parsed);
    };

    EosLogEntry.internalLog = function internalLog(payload) {
        if (_.isObject(payload)) {
            var clean = {};
            for (var index in payload) {
                if (payload.hasOwnProperty(index)) {
                    clean[index] = payload[index];
                }
            }
            return new EosLogEntry(
                {
                    key      : InternalKey,
                    tracking : "eos",
                    message  : payload.constructor.toString(),
                    vars     : clean
                }
            );
        } else {
            return new EosLogEntry(
                {
                    key      : InternalKey,
                    tracking : "eos",
                    message  : payload
                }
            );
        }
    };

    return EosLogEntry;
});