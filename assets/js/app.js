require.config({
    baseUrl: 'js',
    paths: {
        jquery: 'http://cdn.jsdelivr.net/jquery/2.1.1/jquery.min',
        underscore: 'http://cdn.jsdelivr.net/underscorejs/1.6.0/underscore-min',
        sha256: 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/sha256',
        eventemitter: 'lib/eventemitter2',
        inherits: 'lib/inherits',
        eoslogentry: 'eos/logentry',
        eosloggroup: 'eos/loggroup',
        eoskey: 'eos/key',
        eos: 'eos'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'sha256': {
            exports: 'CryptoJS'
        }
    }
});

require(
    [
        'jquery',
        'underscore',
        'eos',
        'ui'
    ],
    function ($, _, eos, ui) {

        // Binding UI
        ui.logWindow      = $('#logWindow');
        ui.tagWindow      = $('#tagWindow');
        var dsnInput      = $('#dsn');
        var tagInput      = $('#tag');
        var realmInput    = $('#realm');
        var secretInput   = $('#secret');
        var connectButton = $('#connect');
        var clearButton   = $('#clearButton');


        var getParam = function (sParam) {
            var sPageURL = window.location.search.substring(1);
            var sURLVariables = sPageURL.split('&');
            for (var i = 0; i < sURLVariables.length; i++)
            {
                var sParameterName = sURLVariables[i].split('=');
                if (sParameterName[0] == sParam)
                {
                    return sParameterName[1];
                }
            }
            return '';
        };

        var eos_ip = getParam('eosip');
        var eos_login = getParam('login');
        var eos_password = getParam('password');

        if(eos_ip) {
            dsnInput.val(eos_ip.trim());
        }

        if (eos_login) {
            realmInput.val(eos_login.trim());
        }

        if (eos_password) {
            secretInput.val(eos_password.trim());
        }

        connectButton.click(function(){
            if (eos.connected) {
                eos.disconnect();
            } else {
                var split = dsnInput.val().split(":");
                eos.connect(split[0], split[1], tagInput.val(), realmInput.val(), secretInput.val());
                secretInput.val("");
            }
        });

        clearButton.click(function() {
            ui.logWindow.empty();
            eos.clear();
        });

        // Setting values
        clearButton.attr("value", 'clear');
        dsnInput.val("127.0.0.1:8090");


        // Registering events
//        eos.on("log", function(payload) { console.debug(payload); });
//        eos.on("debug", eos.logSelf);
        eos.on("disconnect", function(){
            dsnInput.prop('disabled', false);
            tagInput.prop('disabled', false);
            realmInput.prop('disabled', false);
            secretInput.prop('disabled', false);
            connectButton.attr("value", "connect");
        });
        eos.on("connected", function(){
            if (Storage && localStorage) {
                // Saving connection dsn to local storage
                localStorage.setItem("lastDsn", dsnInput.val());
            }
            dsnInput.prop('disabled', true);
            tagInput.prop('disabled', true);
            realmInput.prop('disabled', true);
            secretInput.prop('disabled', true);
            connectButton.attr("value", "disconnect");
        });
        eos.on("newLogEntry", function(data) {
            ui.updateGroup(data.group);
        });
        eos.on("newTag", function(pool) {
            ui.rebuildTagsList(pool);
        });

        eos.disconnect();
        if (Storage && localStorage && localStorage.getItem("lastDsn")) {
            // Reading previous successful dsn
            eos.logSelf("Reading previous success dsn " + localStorage.getItem("lastDsn"));
            dsnInput.val(localStorage.getItem("lastDsn"));
        }
    }
);