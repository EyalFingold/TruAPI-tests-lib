'use strict';

var WebSocket = require('ws');

exports = module.exports = function (vuser) {
    var vuserId;

    /* prepare test data */
    vuserId = vuser.getVUserId();

    /* init action */
    vuser.init('Vuser init action', function (svc, done) {
        svc.logger.info('Vuser %s init', vuserId);

        done();
    });

    /* main action */
    vuser.action('Vuser main action', function (svc, done) {
        svc.logger.info('Vuser %s running', vuserId);
        var idx = 0, len = 10;
        svc.transaction.start('websocketTest');
        var ws = new WebSocket('ws://echo.websocket.org');
        ws.on('open', function () {
            console.log('connected');
            ws.send('Sending First Message');
        });

        ws.on('message', function (data, flags) {
            console.log('Roundtrip time: ' + (Date.now() - parseInt(data)) + 'ms', flags);
            idx++;
            if (idx < len) {
                ws.send(Date.now().toString(), {mask: true});
            }
            else {
                ws.close();
            }
        });

        ws.on('close', function () {
            console.log('disconnected');
            svc.transaction.end('websocketTest', svc.transaction.PASS);
            done();
        });
    });
};