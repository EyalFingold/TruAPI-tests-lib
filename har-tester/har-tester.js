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

//TODO: add parameter manipulation sample/convention (maybe using different file for dependencies )


exports = module.exports = function (vuser) {
    var path = require('path');
    var fs = require("fs");
    var async = require("async");

    // setting defaults
    var vuserId, proxy, urlList;

    var urlCurrentllyProccesed = {count: 0, total: 0, requests: 0, queue: 0, issuesRequests:0};  //urlList['urlCurrentllyProccesed'];
    var BrowserData = {name: "", userAgent: ""};
    var blackListHosts = {};

    vuserId = vuser.getVUserId();
    proxy = process.env.http_proxy ? process.env.http_proxy : undefined;

    /* init action */
    vuser.init('Vuser init action', function (svc, done) {
        svc.logger.info('Vuser %s init', vuserId);

        // starting requests in parallel same as browsers actually behave
        var browsersInfo = [
            {browser: "Firefox 31.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0"},
            {browser: "Opera 12.x", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 6.0; rv:2.0) Gecko/20100101 Firefox/4.0 Opera 12.14"},
            {browser: "Safari 8.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/600.1.25 (KHTML, like Gecko) Version/8.0 Safari/600.1.25"},
            {browser: "IE 10", threadsPerDomain: 8, UserAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0"},
            {browser: "IE 11", threadsPerDomain: 13, UserAgent: "Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko"},
            {browser: "Chrome 37.0", threadsPerDomain: 6, UserAgent: "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36"}
        ]
        var chosenBrowserID = Math.floor((Math.random() * (browsersInfo.length - 1)) + 1);
        BrowserData.browsersThreads = browsersInfo[chosenBrowserID]['threadsPerDomain'];
        BrowserData.name = browsersInfo[chosenBrowserID]['browser'];
        BrowserData.userAgent = browsersInfo[chosenBrowserID]['UserAgent'];

        // get all the blacklist hosts
        blackListHostsFile = 'black-list.json';
        var tmpdata = JSON.parse(loadFromFile(blackListHostsFile))
        blackListHosts = tmpdata.blackListHostNames;
        done();
    });

    function loadHarFile(svc, urlListFile, urlList, urlLists, hosts) {
        /* load url list */
        svc.logger.info('load url list from %s', urlListFile);
        try {

            // get all the Urls for Har File
            urlList = JSON.parse(loadFromFile(urlListFile)).log.entries;
            urlList['len'] = urlList.length;
            urlList['idx'] = 0;
            urlList['queue'] = [];
            urlList['cookies'] = [];

            // split the urls based on domain to allow running concurrent tests per host
            //geting url lists
            getDomains(urlList, hosts);

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
    }

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

    function getDomains(urlList, hosts) {
        for (var j = 0; j < urlList.length; j++) {
            var host = urlList[j].request.headers[arrayObjectIndexOf(urlList[j].request.headers, "name", "Host")];
            if (host !== undefined) {
                var hostsIndex = hosts.indexOf(host.value);
                if (hostsIndex === -1) {
                    hosts.push(host.value);
                    urlLists[host.value] = [];
                    urlLists[host.value]['name'] = host.value;
                    urlLists[host.value]['len'] = 0;
                    urlLists[host.value]['idx'] = 0;
                    urlLists[host.value]['queue'] = [];
                    urlLists[host.value]['cookies'] = [];
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

    function testUrlItem(urlList, svc, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData) {
        urlList['idx']++;
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count + 1;
        urlCurrentllyProccesed.total = urlCurrentllyProccesed.total + 1;

        // need to add URL to Q, capture/build parameters and pass them to next in line
        // for now we just skipping URL to make sure all static ones are handled ok
        var reqOpts;
        StaticCallback = StaticCallback || function () {
        };
        urlItem = urlItem || {};

        var mimeType = "";
        if ((undefined !== urlItem) && (undefined !== urlItem.response) && (undefined !== urlItem.response.content) && (undefined !== urlItem.response.content.mimeType))
            mimeType = urlItem.response.content.mimeType;

        // TODO: verify static files dont require authentication as well
        if (checkIsStaticMimeTypes(mimeType))
            testStaticUrlItem(urlList, svc, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
        else if (urlList['queue'].length > 0) {
            // adding the URL to the queue array
            // adding url as an id to later remove from queue
            urlItem['url'] = urlItem.request.url;
            urlList['queue'].push(urlItem);
            urlCurrentllyProccesed.queue++;
        }
        else {
            // Process not static urlItem
            // adding url as an id to later remove from queue
            urlItem['url'] = urlItem.request.url;
            urlList['queue'].push(urlItem);
            urlCurrentllyProccesed.queue++;
            testNonStaticUrlItem(urlList, svc, urlItem.request.url, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
        }
    }

    function testNonStaticUrlItem(urlList, svc, url, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData) {
        var reqOpts;

        nonStaticCallback = nonStaticCallback || function () {
        };
        urlItem = urlItem || {};
        /* setting up request options, coping related request options from recorded har */
        reqOpts = {
            url: urlItem.request.url,
            proxy: proxy,
            method: urlItem.request.method,
            headers: {
                'User-Agent': BrowserData.userAgent
            },
        };

        // adding post data if needed
        if (undefined !== urlItem.request.postData)
            reqOpts.body = urlItem.request.postData.text;

        // adding all headrs but User-Agent and Cookies
        for (var i = 0, len = urlItem.request.headers.length; i < len; i++) {
            if (((undefined !== urlItem.request.headers[i].name)) && (urlItem.request.headers[i].name !== "User-Agent")) {
                reqOpts.headers[urlItem.request.headers[i].name] = urlItem.request.headers[i].value;
            }
        }

        // if URL is not in blacklist
        if (checkBlackList(urlItem.request.url)) {
            urlCurrentllyProccesed.requests = urlCurrentllyProccesed.requests + 1;
            svc.logger.info('Testing URL %s:%s \n %s%s', reqOpts.method, reqOpts.url, JSON.stringify(reqOpts.headers));

            svc.request(reqOpts, function (err, res, body) {
                urlCurrentllyProccesed.issuesRequests++;
                if (err) {
                    svc.logger.error('request error %s', JSON.stringify(err));
                } else if (undefined !== res) {
                    svc.logger.info("Processing request for tokens in Cookies...%s", reqOpts.url);

                    if ((undefined !== res.headers) && (undefined !== res.headers['set-cookie'] )) {
                        svc.logger.info("found some cookies", res.headers['set-cookie']);

                    }
                    //urlList['cookies']

                    svc.logger.info("checking request...%s", reqOpts.url);
                    if (urlItem.response.status === res.statusCode) {
                        svc.logger.info("status Response comparison ok");
                    }
                    else {
                        svc.logger.error("status Response is not equal to original recording\n Original:%s\nNew:%s", urlItem.response.status, JSON.stringify(res.statusCode));
                    }

                    /* verifing basic: status is same, content-type is same */
                    if (undefined !== res.headers) {
                        if (urlItem.response.headers['content-type'] === res.headers['content-type']) {
                            svc.logger.info("content-type Response comparison ok");
                        }
                        else {
                            svc.logger.error("content-type Response is not equal to original recording\n Original:%s\nNew:%s", urlItem.response.headers['content-type'], res.headers['content-type']);
                        }
                    }
                    svc.logger.info('After Testing URL %s:%s --> %s', reqOpts.method, reqOpts.url, res.statusCode);
                }
                nonStaticCallback(urlList, svc, url, urlCurrentllyProccesed, done, BrowserData, nonStaticCallback, StaticCallback);
            });
        }
        else {
            urlCurrentllyProccesed.issuesRequests++;
            svc.logger.info('Skipping URL %s', urlItem.request.url);
            nonStaticCallback(urlList, svc, url, urlCurrentllyProccesed, done, BrowserData, nonStaticCallback, StaticCallback);
        }
    }

    function onNonStaticCallback(urlList, svc, url, urlCurrentllyProccesed, done, BrowserData, nonStaticCallback, StaticCallback, err) {
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count - 1;
        urlList['queue'].splice(arrayObjectIndexOf(urlList['queue'], "url", url), 1);
        svc.logger.info("NON-Static Processing %d Urls", urlCurrentllyProccesed.count, " --- ", BrowserData.name, "queuecount:", urlCurrentllyProccesed.queue);
        if (err) {
            svc.logger.error('Error:%s', JSON.stringify(err));
        }
        // do we need to handle more nonstatic url pending in Q?
        else if (urlList['queue'].length > 0) {
            // getting the next URL from the queue array
            var urlItem = urlList['queue'].shift();
            urlList['idx']++;
            urlCurrentllyProccesed.count = urlCurrentllyProccesed.count + 1;
            urlCurrentllyProccesed.total = urlCurrentllyProccesed.total + 1;
            testNonStaticUrlItem(urlList, svc, urlItem.request.url, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
        }
        else {
            // testing the next Url
            if ((urlList['idx'] + urlList['queue'].length ) < urlList['len']) {
                //* test the next url *//
                testUrlItem(urlList, svc, urlList[ urlList['idx']], urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
            }
            else if (urlCurrentllyProccesed.count === BrowserData.browsersThreads-1) {
                console.log("--------------------------------- closing ", BrowserData.name);
                svc.logger.info("-------  user %d visited %d urls, %d requests, others were skipped ", vuser.getVUserId(), urlCurrentllyProccesed.total, urlCurrentllyProccesed.requests);
                done(null, null);
            }
            else {
                svc.logger.info("onStaticCallback doing noting");
            }

        }
    }

    function checkIsStaticMimeTypes(mimeType) {
        // checking some known static mimeType
        if (mimeType === "image/gif") return true;
        if (mimeType === "text/css") return true;
        if (mimeType === "image/png") return true;
        if (mimeType === "application/javascript") return true;
        if (mimeType === "application/font-woff") return true;
        if (mimeType === "image/svg+xml") return true;
        if (mimeType === "application/x-javascript") return true;
        if (mimeType === "application/x-font-ttf") return true;
        return false;
    }

    function testStaticUrlItem(urlList, svc, urlItem, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData) {
        var reqOpts;
        StaticCallback = StaticCallback || function () {
        };
        urlItem = urlItem || {};
        /* setting up request options, coping related request options from recorded har */
        reqOpts = {
            url: urlItem.request.url,
            proxy: proxy,
            method: urlItem.request.method,
            headers: {
                'User-Agent': BrowserData.userAgent
            },
        };

        // adding post data if needed
        if (undefined !== urlItem.request.postData)
            reqOpts.body = urlItem.request.postData.text;

        // adding all headrs but User-Agent and Cookies
        for (var i = 0, len = urlItem.request.headers.length; i < len; i++) {
            if (((undefined !== urlItem.request.headers[i].name)) && (urlItem.request.headers[i].name !== "User-Agent")) {
                reqOpts.headers[urlItem.request.headers[i].name] = urlItem.request.headers[i].value;
            }
        }

        // if URL is not in blacklist
        if (checkBlackList(urlItem.request.url)) {
            urlCurrentllyProccesed.requests = urlCurrentllyProccesed.requests + 1;
            svc.logger.info('Testing URL %s:%s \n %s%s', reqOpts.method, reqOpts.url, JSON.stringify(reqOpts.headers));


            svc.request(reqOpts, function (err, res, body) {
                urlCurrentllyProccesed.issuesRequests++;
                if (err) {
                    svc.logger.error('request error %s', JSON.stringify(err));
                } else if (undefined !== res) {
                    svc.logger.info("checking request...%s", reqOpts.url);
                    if (urlItem.response.status === res.statusCode) {
                        svc.logger.info("status Response comparison ok");
                    }
                    else {
                        svc.logger.error("status Response is not equal to original recording\n Original:%s\nNew:%s", urlItem.response.status, JSON.stringify(res.statusCode));
                    }

                    /* verifing basic: status is same, content-type is same */
                    if (undefined !== res.headers) {
                        if (urlItem.response.headers['content-type'] === res.headers['content-type']) {
                            svc.logger.info("content-type Response comparison ok");
                        }
                        else {
                            svc.logger.error("content-type Response is not equal to original recording\n Original:%s\nNew:%s", urlItem.response.headers['content-type'], res.headers['content-type']);
                        }
                    }

                    svc.logger.info('After Testing URL %s:%s --> %s', reqOpts.method, reqOpts.url, res.statusCode);
                }
                StaticCallback(urlList, svc, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
            });
        }
        else {
            svc.logger.info('Skipping URL %s', urlItem.request.url);
            StaticCallback(urlList, svc, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
        }
    }

    function onStaticCallback(urlList, svc, urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData, err) {
        urlCurrentllyProccesed.count = urlCurrentllyProccesed.count - 1;
        if (err) {
            svc.logger.error('Error:%s', JSON.stringify(err));
        }

        svc.logger.info("Static Processing %d Urls", urlCurrentllyProccesed.count, " --- ", BrowserData.name, "queuecount:", urlCurrentllyProccesed.queue);

        // testing the next Url
        if ((urlList['idx'] + urlList['queue'].length ) < urlList['len']) {
            //* test the next url *//
            testUrlItem(urlList, svc, urlList[ urlList['idx']], urlCurrentllyProccesed, nonStaticCallback, StaticCallback, done, BrowserData);
        }
        else if (urlCurrentllyProccesed.count === BrowserData.browsersThreads-1) {
            console.log("--------------------------------- closing ", BrowserData.name);
            svc.logger.info("-------  user %d visited %d urls, %d requests, others were skipped ", vuser.getVUserId(), urlCurrentllyProccesed.total, urlCurrentllyProccesed.requests);
            done(null, null);
        }
        else {
        }
    }

    function testHost(urlList, svc, done, BrowserData, urlCurrentllyProccesed) {
        for (var browsersThreadsidx = 0; browsersThreadsidx < BrowserData.browsersThreads; browsersThreadsidx++) {
            if ((undefined !== urlList[ urlList['idx']]) && ((urlList['idx'] + urlList['queue'].length) < urlList['len'])) {
                svc.logger.info("INIT THREAD _________________________________%d", browsersThreadsidx);
                testUrlItem(urlList, svc, urlList[ urlList['idx']], urlCurrentllyProccesed, onNonStaticCallback, onStaticCallback, done, BrowserData);
            }
        }
    }

    function testHARFIle(svc, filename, done) {
        // preparing list for testing
        urlList = {};
        urlLists = {};
        hosts = [];
        // load lists of Urls from HAR file
        loadHarFile(svc, filename, urlList, urlLists, hosts);

        if (urlList.length <= 0) {
            svc.logger.error('An invalid Url list.');
            done(null, null);
            return;
        }
        else {
            svc.logger.info('Test Url list length is %d', urlList['len']);
        }

        svc.logger.info("--------------------------------- starting ", BrowserData, " w");

        for (var propt in urlLists) {
            svc.logger.info("****************** host: ", propt, 'len:', urlLists[propt]['len'], '*********************');
            testHost(urlLists[propt], svc, done, BrowserData, urlCurrentllyProccesed);
        }
    }

    vuser.action('Vuser main action', function (svc, done) {

        // testHARFIle(svc, 'www.ynet.co.il3 - 31sec load.har', done);
        svc.transaction.start(BrowserData.name);
        var fileNameTotest = "";
        async.series({
                f1: function (callback) {
                    //fileNameTotest = "rsvpstaging.har";
                    fileNameTotest = "har1.har";
                    svc.transaction.start(fileNameTotest);
                    console.log(" going to test %s", fileNameTotest);
                    testHARFIle(svc, fileNameTotest, callback);

                },
                 f2: function (callback) {
                 svc.transaction.end(fileNameTotest, svc.transaction.PASS);
                 fileNameTotest = "har1.har";
                 svc.transaction.start(fileNameTotest);
                 console.log(" going to test %s",fileNameTotest);
                 testHARFIle(svc, fileNameTotest, callback);
                 }

            },
            function (err, results) {
                svc.transaction.end(fileNameTotest, svc.transaction.PASS);
                svc.transaction.end(BrowserData.name, svc.transaction.PASS);
                console.log("going to call Done");
                done();
            });
    });

};
