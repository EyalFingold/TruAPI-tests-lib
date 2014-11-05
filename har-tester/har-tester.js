//TODO: add login sample using http basic authentication
//TODO: add login using OTP
//TODO add login using form submission and cookie persistence
//TODO: add random browser agents & threads
//TODO: support post/delete etc... when creating request
//TODO: add parameter manipulation sample
//TODO: add smart parameters/cookies
//TODO: add sample URL manipulation.

exports = module.exports = function (vuser) {
    var path = require('path');
    var fs = require("fs");
    var vuserId, proxy, urlListFile, urlList;

    /* prepare test data */
    vuserId = vuser.getVUserId();
    urlListFile = 'har1.har';
    urlList = {};
    proxy = process.env.http_proxy ? process.env.http_proxy : undefined;

    /* init action */
    vuser.init('Vuser init action', function (svc, done) {
        svc.logger.info('Vuser %s init', vuserId);
        /* load url list */
        // urlListFile = path.resolve(__dirname, urlListFile);
        svc.logger.info('load url list from %s', urlListFile);
        try {
            urlList = JSON.parse(loadFromFile(urlListFile)).log.entries;
        }
        catch (err) {
            svc.logger.error('Cannot load url list from %s', err, urlListFile);
        }
        done();
    });

    function loadFromFile(filename) {
        //console.log('in loadFromFile');
        var fs = require('fs');
        var file = __dirname + '/' + filename;
        var newdata = fs.readFileSync(file, 'utf8');
        return newdata;
    }

    Array.prototype.get = function(name) {
        for (var i=0, len=this.length; i<len; i++) {
            if (typeof this[i] != "object") continue;
            if (this[i].name === name) return this[i].value;
        }
    };


    /* test URL item */
    function testUrlItem(svc, urlItem,urlCurrentllyProccesed, callback,done) {

        var reqOpts;
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count +1 ;
        svc.logger.info("Processing %d Urls",urlCurrentllyProccesed.count);
        callback = callback || function () {
        };
        urlItem = urlItem || {};
        /* setting up request options, coping related request options from recorded har */
        reqOpts = {
            url: urlItem.url,
            proxy: proxy,
            method:urlItem.method,
            headers: {
                'User-Agent': urlItem.headers.get('User-Agent')
            }
        };
        svc.logger.info('Testing URL %s', urlItem.url);
        svc.request(reqOpts, function (err, res, body) {
            if (err) {
                svc.logger.error('request error %s', err.toString());
            }
            /* TODO: add code to check if the results size is similar to recorded one  */
            callback(urlCurrentllyProccesed,done);
        });
    }

    /* main action */
    vuser.action('Vuser main action', function (svc, done) {
        var idx, len;
        idx = 0;
        var urlCurrentllyProccesed = {count:0};
        len = urlList.length;

        svc.logger.info('Test Url list length is %d', len);

        if (urlList.length <= 0) {
            svc.logger.error('An invalid Url list.');
            done();
            return;
        }


        function onCallback(urlCurrentllyProccesed,done,err) {
            if (err) {
                svc.logger.error('Error: %s', err.toString());
            }
            urlCurrentllyProccesed.count = urlCurrentllyProccesed.count -1 ;
            svc.logger.info("Currentlly Processing %d Urls",urlCurrentllyProccesed.count);
            idx++;
            if (idx < len) {
                //* test the next url *//
                testUrlItem(svc, urlList[idx].request,urlCurrentllyProccesed, onCallback,done);
            }
            else if (urlCurrentllyProccesed.count===0)
            {
                svc.transaction.end('requestTest', svc.transaction.PASS);
                svc.logger.info("going to call DONE _________________________________%d",vuser.getVUserId());
                done();
            }
        }

        //* test the first url *//
        svc.transaction.start('requestTest');

        // starting requests in parallel same as browsers actually behave

        var browsersInfo = [
              {borwser: "Firefox 2", threadsPerDomain:2, UserAgent:"test"},
              {borwser: "Firefox 3", threadsPerDomain:6, UserAgent:"test"},
              {borwser: "Opera 9.26", threadsPerDomain:4, UserAgent:"test"},
              {borwser: "Opera 12", threadsPerDomain:6, UserAgent:"test"},
              {borwser: "Safari 3", threadsPerDomain:4, UserAgent:"test"},
              {borwser: "Safari 5", threadsPerDomain:6, UserAgent:"test"},
              {borwser: "IE 7", threadsPerDomain:2, UserAgent:"test"},
              {borwser: "IE 8", threadsPerDomain:6, UserAgent:"test"},
              {borwser: "IE 10", threadsPerDomain:8, UserAgent:"test"},
              {borwser: "Chrome", threadsPerDomain:6, UserAgent:"test"}]
        var browsersThreads = 6; //setting as chrome for now
        urlCurrentllyProccesed.count = 0;
        for (var browsersThreadsidx = 0; browsersThreadsidx < browsersThreads; browsersThreadsidx++) {
            if (idx < len) {
                testUrlItem(svc, urlList[idx].request,urlCurrentllyProccesed, onCallback,done);
            }
            idx++;
        }
    });
};
