/*
 har-tester test is meant to simulate load on server based on har(HTTP Archive format) files, that can be created using developers tools of commonly used browsers.

 Current implementation take into consideration the following:
 - Url
 - Method
 - User Agent
 Current implementation simulate several concurrent connections per 'All' hosts -  in a some  similar manner to common browsers.
 Browsers are randomly chosen, the concurrent connections for  'all' host  is added to support flows that are cross hosts (for example authentication host)

 Current implementation support black list - add block hosts to black-list.json
 */


exports = module.exports = function (vuser) {
    var harHelper = require('./har-helper.js');
    var path = require('path');
    var fs = require("fs");
    var async = require("async");

    // setting defaults
    var vuserId;
    var BrowserData = {name: "", userAgent: ""};
    var blackListHosts = {};
    var CollectedCookies = {};
    var Parameters = {};

    vuserId = vuser.getVUserId();

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
        var tmpdata = JSON.parse(harHelper.loadFromFile(blackListHostsFile));
        blackListHosts = tmpdata.blackListHostNames;

        done();
    });

    vuser.action('Vuser main action', function (svc, done) {

        // testHARFIle(svc, 'www.ynet.co.il3 - 31sec load.har', done);
        svc.transaction.start(BrowserData.name);
        var fileNameTotest = "";
        async.series({
                f1: function (callback) {
                    fileNameTotest = "har2.har";
                    svc.transaction.start(fileNameTotest);
                    svc.logger.info(" going to test %s", fileNameTotest);
                    harHelper.testHARFIle(svc, fileNameTotest, callback,BrowserData,blackListHosts,vuser,CollectedCookies,Parameters);
                }/*,
                f1T: function(callback)
                {
                    svc.transaction.thinkTime(fileNameTotest, 1000 * 1, function () {
                        svc.logger.info(" thinkTime %s", fileNameTotest);
                        callback();
                    });
                },
                f2: function (callback) {
                    fileNameTotest = "SomeFIle2";
                    svc.transaction.start(fileNameTotest);
                    svc.logger.info(" going to test %s", fileNameTotest);
                    harHelper.testHARFIle(svc, fileNameTotest, callback,BrowserData,blackListHosts,vuser,CollectedCookies,Parameters);
                },
                f2T: function(callback)
                {
                    svc.transaction.thinkTime(fileNameTotest, 1000 * 2, function () {
                        svc.logger.info(" thinkTime %s", fileNameTotest);
                        callback();
                    });
                },
                f3: function (callback) {
                    fileNameTotest = "SomeFIle3.har";
                    svc.transaction.start(fileNameTotest);
                    svc.logger.info(" going to test %s", fileNameTotest);
                    harHelper.testHARFIle(svc, fileNameTotest, callback,BrowserData,blackListHosts,vuser,CollectedCookies,Parameters);
                },
                f3T: function(callback)
                {
                    svc.transaction.thinkTime(fileNameTotest, 1000 * 5, function () {
                        svc.logger.info(" thinkTime %s", fileNameTotest);
                        callback();
                    });
                },
                f4: function (callback) {
                    fileNameTotest = "SomeFIle4.har";
                    svc.transaction.start(fileNameTotest);
                    svc.logger.info(" going to test %s", fileNameTotest);
                    harHelper.testHARFIle(svc, fileNameTotest, callback,BrowserData,blackListHosts,vuser,CollectedCookies,Parameters);
                }*/

            },
            function (err, results) {
                svc.logger.info('collectedCookies:%s',collectedCookies);
                svc.transaction.end(fileNameTotest, svc.transaction.PASS);
                svc.transaction.end(BrowserData.name, svc.transaction.PASS);
                svc.logger.info("going to call Done");
                done();
            });
    });

};
