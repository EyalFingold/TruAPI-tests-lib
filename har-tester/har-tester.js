//TODO: add login sample using http basic authentication
//TODO: add login using OTP
//TODO add login using form submission and cookie persistence
//TODO: add send proper user-agent per browser
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
    function testUrlItem(svc, urlItem,urlCurrentllyProccesed, callback,done,BrowserData) {
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
                'User-Agent': BrowserData.userAgent
            }
        };
        svc.logger.info('Testing URL %s', urlItem.url);
        svc.request(reqOpts, function (err, res, body) {
            if (err) {
                svc.logger.error('request error %s', err.toString());
            }
            /* TODO: add code to check if the results size is similar to recorded one  */
            callback(urlCurrentllyProccesed,done,BrowserData);
        });
    }

    /* main action */
    vuser.action('Vuser main action', function (svc, done) {
        var idx, len;
        idx = 0;
        var urlCurrentllyProccesed = {count:0};
        var BrowserData = {name:"" , userAgent:""};
        len = urlList.length;
        svc.logger.info('Test Url list length is %d', len);
        if (urlList.length <= 0) {
            svc.logger.error('An invalid Url list.');
            done();
            return;
        }


        function onCallback(urlCurrentllyProccesed,done,BrowserData,err) {
            if (err) {
                svc.logger.error('Error: %s', err.toString());
            }
            urlCurrentllyProccesed.count = urlCurrentllyProccesed.count -1 ;
            svc.logger.info("Processing %d Urls",urlCurrentllyProccesed.count," --- ", BrowserData.name);
            idx++;
            if (idx < len) {
                //* test the next url *//
                testUrlItem(svc, urlList[idx].request,urlCurrentllyProccesed, onCallback,done,BrowserData);
            }
            else if (urlCurrentllyProccesed.count===0)
            {
                console.log("--------------------------------- closing ",browsersInfo[chosenBrowserID]['borwser']);

                svc.transaction.end(BrowserData.name, svc.transaction.PASS);
                svc.logger.info("going to call DONE _________________________________%d",vuser.getVUserId());
                done();
            }
        }

        //* test the first url *//

        // starting requests in parallel same as browsers actually behave

        var browsersInfo = [
              {borwser: "Firefox 2", threadsPerDomain:2, UserAgent:"Mozilla/5.0 (Windows; Windows NT 5.1; en-US; rv:1.8.1.9) Gecko/20071025 Firefox/2.0.0.9"},
              {borwser: "Firefox 31.0", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"},
              {borwser: "Opera 9.26", threadsPerDomain:4, UserAgent:"Mozilla/5.0 (Windows NT 5.1; U; en; rv:1.8.0) Gecko/20060728 Firefox/1.5.0 Opera 9.26"},
              {borwser: "Opera 12.x", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (Windows NT 6.0; rv:2.0) Gecko/20100101 Firefox/4.0 Opera 12.14"},
              {borwser: "Safari 3.2.3", threadsPerDomain:4, UserAgent:"Mozilla/5.0 (Windows; U; Windows NT 5.1; cs-CZ) AppleWebKit/525.28.3 (KHTML, like Gecko) Version/3.2.3 Safari/525.29"},
              {borwser: "Safari 8.0", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/600.1.25 (KHTML, like Gecko) Version/8.0 Safari/600.1.25"},
              {borwser: "IE 7", threadsPerDomain:2, UserAgent:"Mozilla/5.0 (Windows; U; MSIE 7.0; Windows NT 6.0; en-US)"},
              {borwser: "IE 8", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; GTB7.4; InfoPath.2; SV1; .NET CLR 3.3.69573; WOW64; en-US)"},
              {borwser: "IE 9", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"},
              {borwser: "IE 10", threadsPerDomain:8, UserAgent:"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0"},
              {borwser: "IE 11", threadsPerDomain:13, UserAgent:"Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"},
              {borwser: "Chrome 37.0", threadsPerDomain:6, UserAgent:"Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36"}]


        var chosenBrowserID =  Math.floor((Math.random() * (browsersInfo.length-1)) + 1);
        var browsersThreads = browsersInfo[chosenBrowserID]['threadsPerDomain']; //setting as chrome for now
        BrowserData.name = browsersInfo[chosenBrowserID]['borwser'];
        BrowserData.userAgent =  browsersInfo[chosenBrowserID]['UserAgent'];
        console.log("--------------------------------- starting ",BrowserData, " w");
        svc.transaction.start(BrowserData.name);
        urlCurrentllyProccesed.count = 0;
        for (var browsersThreadsidx = 0; browsersThreadsidx < browsersThreads; browsersThreadsidx++) {
            if (idx < len) {
                svc.logger.info("INIT THREAD _________________________________%d",browsersThreadsidx);
                testUrlItem(svc, urlList[idx].request,urlCurrentllyProccesed, onCallback,done, BrowserData);
            }
            idx++;
        }
    });
};
