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
      svc.datapoint.add('my-data', 100);
      var idx, len=10;
      idx = 0;
    svc.transaction.start('requestTest');
      var ws = new WebSocket('ws://echo.websocket.org');
      ws.on('open', function() {
          console.log('connected');
          //ws.send(Date.now().toString(), {mask: true});
           ws.send('Sending First Message');
      });

      ws.on('message', function(data, flags) {
          console.log('Roundtrip time: ' + (Date.now() - parseInt(data)) + 'ms', flags);
          idx++;
          if (idx < len) {
              ws.send(Date.now().toString(), {mask: true});
          }
          else
          {
             ws.close();
          }
      });

      ws.on('close', function() {
          console.log('disconnected');
          svc.transaction.end('requestTest', svc.transaction.PASS);
          done();
      });
  });
};