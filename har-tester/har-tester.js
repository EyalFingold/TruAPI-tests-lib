/*
har-tester test is meant to simulate load on server based on har(HTTP Archive format) files, that can be created using developers tools of commonly used browsers.

Current implementation take into consideration the following:
- Url
- Method
- User Agent

Current implementation simulate several concurrent connections per host, in a similar manner to common browsers.
Browsers are randomly chosen

Current implementation support black list - add block hosts to black-list.json
*/


//TODO: add payload in case of POST - currently empty post
//TODO: add headers (not including cookies and special headers)
//TODO: add login sample using http basic authentication
//TODO: add login using OTP
//TODO:  add login using form submission and cookie persistence
//TODO: add send proper user-agent per browser
//TODO: support post/delete etc... when creating request
//TODO: add parameter manipulation sample
//TODO: add smart parameters/cookies
//TODO: add sample URL manipulation.

exports = module.exports = function (vuser) {
    var path = require('path');
    var fs = require("fs");
    var vuserId, proxy, urlListFile, urlList;
    var hosts = [];

    /* prepare test data */
    vuserId = vuser.getVUserId();
    urlListFile = 'www.ynet.co.il3 - 31sec load.har';
    blackListHostsFile = 'black-list.json';
    urlList = {};
    urlLists = {};
    blackListHosts = {};

    proxy = process.env.http_proxy ? process.env.http_proxy : undefined;

    /* init action */
    vuser.init('Vuser init action', function (svc, done) {
        svc.logger.info('Vuser %s init', vuserId);
        /* load url list */
        // urlListFile = path.resolve(__dirname, urlListFile);
        svc.logger.info('load url list from %s', urlListFile);
        try {

            // get all the Urls for Har File
            urlList = JSON.parse(loadFromFile(urlListFile)).log.entries;
            urlList['len'] = urlList.length;
            urlList['idx'] = 0;
            // get all the blacklist hosts
            var tmpdata = JSON.parse(loadFromFile(blackListHostsFile))
            blackListHosts = tmpdata.blackListHostNames;

            // split the urls based on domain to allow running concurrent tests per host
            //geting url lists
           getDomains(urlList);

            //generating urls lists based on the hosts
            for (var j = 0; j < urlList.length; j++) {
                var host = urlList[j].request.headers[arrayObjectIndexOf(urlList[j].request.headers, "name", "Host")];
                if (host !== undefined) {
                    var hostsIndex = hosts.indexOf(host.value);
                    if (hostsIndex !== -1) {
                        urlLists[host.value].push(urlList[j]);
                        urlLists[host.value]['len']++;
                    }
                }
            }
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

    function arrayObjectIndexOf(array, property, value) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i][property] === value) return i;
        }
        return -1;
    }

    function getDomains(urlList) {
        for (var j = 0; j < urlList.length; j++) {
            var host = urlList[j].request.headers[arrayObjectIndexOf(urlList[j].request.headers, "name", "Host")];
           if (host!==undefined)
           {
            var hostsIndex = hosts.indexOf(host.value);
            if (hostsIndex === -1) {
                hosts.push(host.value);
                urlLists[host.value] = [];
                urlLists[host.value]['name'] = host.value;
                urlLists[host.value]['len'] = 0;
                urlLists[host.value]['idx'] = 0;
            }
           }
        }
    }

    function checkBlackList(urlToCheck) {
        for (var j = 0; j < blackListHosts.length; j++) {
            if (urlToCheck.indexOf(blackListHosts[j]) >= 0) {
                return false;
            }
        }
        return true;
    }

    Array.prototype.get = function (name) {
        for (var i = 0, len = this.length; i < len; i++) {
            if (typeof this[i] != "object") continue;
            if (this[i].name === name) return this[i].value;
        }
    };

    function testUrlItem(urlList,svc, urlItem, urlCurrentllyProccesed, callback, done, BrowserData) {
        var reqOpts;
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count + 1;
        urlCurrentllyProccesed.total = urlCurrentllyProccesed.total + 1;
        svc.logger.info("Processing %d Urls", urlCurrentllyProccesed.count);
        callback = callback || function () {
        };
        urlItem = urlItem || {};
        /* setting up request options, coping related request options from recorded har */
        reqOpts = {
            url: urlItem.url,
            proxy: proxy,
            method: urlItem.method,
            headers: {
                'User-Agent': BrowserData.userAgent
            }
        };


        if (checkBlackList(urlItem.url)) {
            urlCurrentllyProccesed.requests = urlCurrentllyProccesed.requests + 1;
            svc.logger.info('Testing URL %s', urlItem.url);
            svc.request(reqOpts, function (err, res, body) {
                if (err) {
                    svc.logger.error('request error %s', err.toString());
                }
                /* TODO: add code to check if the results size is similar to recorded one  */
                callback(urlList,svc,urlCurrentllyProccesed, done, BrowserData,urlItem.url + 'Method:' + urlItem.method);
            });
        }
        else {
            svc.logger.info('Skipping URL %s', urlItem.url);
            callback(urlList,svc,urlCurrentllyProccesed, done, BrowserData,urlItem.url + 'Method:' + urlItem.method);
        }
    }

    function onCallback(urlList,svc, urlCurrentllyProccesed, done, BrowserData, err,urlItem) {
        if (err) {
            svc.logger.error('Error: %s   on URL:%s', err.toString(),urlItem);
        }
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count - 1;
        svc.logger.info("Processing %d Urls", urlCurrentllyProccesed.count, " --- ", BrowserData.name);
        urlList['idx']++;
        if ( urlList['idx'] <  urlList['len']) {
            //* test the next url *//
            testUrlItem(urlList,svc, urlList[ urlList['idx']].request, urlCurrentllyProccesed, onCallback, done, BrowserData);
        }
        else if (urlCurrentllyProccesed.count === 0) {
            console.log("--------------------------------- closing ", BrowserData.name);

            svc.transaction.end(BrowserData.name, svc.transaction.PASS);
            svc.logger.info("------- going to call DONE on user %d visited %d urls, %d requests, others were skipped ", vuser.getVUserId(),urlCurrentllyProccesed.total, urlCurrentllyProccesed.requests);
            done();
        }
    }

    function checkhost(urlList,svc,done, BrowserData,urlCurrentllyProccesed){
        for (var browsersThreadsidx = 0; browsersThreadsidx < BrowserData.browsersThreads; browsersThreadsidx++) {
            if ( urlList['idx'] <  urlList['len']) {
                svc.logger.info("INIT THREAD _________________________________%d", browsersThreadsidx);
                testUrlItem(urlList,svc, urlList[ urlList['idx']].request, urlCurrentllyProccesed, onCallback, done, BrowserData);
            }
            urlList['idx']++;
        }
    }

    vuser.action('Vuser main action', function (svc, done) {
        urlList['urlCurrentllyProccesed'] = {count: 0};
        var urlCurrentllyProccesed  = {count: 0, total: 0, requests:0};  //urlList['urlCurrentllyProccesed'];
        var BrowserData = {name: "", userAgent: ""};
        svc.logger.info('Test Url list length is %d',  urlList['len']);
        if (urlList.length <= 0) {
            svc.logger.error('An invalid Url list.');
            done();
            return;
        }

        //* test the first url *//
        // starting requests in parallel same as browsers actually behave
        var browsersInfo = [
            {browser: "Firefox 2", threadsPerDomain: 2, UserAgent: "Mozilla/5.0 (Windows; Windows NT 5.1; en-US; rv:1.8.1.9) Gecko/20071025 Firefox/2.0.0.9"},
            {browser: "Firefox 31.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"},
            {browser: "Opera 9.26", threadsPerDomain: 4, UserAgent: "Mozilla/5.0 (Windows NT 5.1; U; en; rv:1.8.0) Gecko/20060728 Firefox/1.5.0 Opera 9.26"},
            {browser: "Opera 12.x", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 6.0; rv:2.0) Gecko/20100101 Firefox/4.0 Opera 12.14"},
            {browser: "Safari 3.2.3", threadsPerDomain: 4, UserAgent: "Mozilla/5.0 (Windows; U; Windows NT 5.1; cs-CZ) AppleWebKit/525.28.3 (KHTML, like Gecko) Version/3.2.3 Safari/525.29"},
            {browser: "Safari 8.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/600.1.25 (KHTML, like Gecko) Version/8.0 Safari/600.1.25"},
            {browser: "IE 7", threadsPerDomain: 2, UserAgent: "Mozilla/5.0 (Windows; U; MSIE 7.0; Windows NT 6.0; en-US)"},
            {browser: "IE 8", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; GTB7.4; InfoPath.2; SV1; .NET CLR 3.3.69573; WOW64; en-US)"},
            {browser: "IE 9", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))"},
            {browser: "IE 10", threadsPerDomain: 8, UserAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0"},
            {browser: "IE 11", threadsPerDomain: 13, UserAgent: "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"},
            {browser: "Chrome 37.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36"}
        ]
        var chosenBrowserID = Math.floor((Math.random() * (browsersInfo.length - 1)) + 1);
        BrowserData.browsersThreads = browsersInfo[chosenBrowserID]['threadsPerDomain']; //setting as chrome for now
        BrowserData.name = browsersInfo[chosenBrowserID]['browser'];
        BrowserData.userAgent = browsersInfo[chosenBrowserID]['UserAgent'];

        console.log("--------------------------------- starting ", BrowserData, " w");
        svc.transaction.start(BrowserData.name);

        for(var propt in urlLists){
            console.log("****************** host: ",propt ,'len:',urlLists[propt]['len'],'*********************');
            checkhost(urlLists[propt],svc,done,BrowserData,urlCurrentllyProccesed);
        }

    });


};
