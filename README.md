TruAPI-tests-lib
================

TruAPI:
-------
 - TruAPI is an innovative scripting tool based on node.js.
 - TruAPI enables you to create JavaScript-based Vuser scripts and provides an API for handling transactions, think time, logging and HTTP handling.
 - TruAPI scripts can be packaged and uploaded to StormRunner and added to a test definition.


TruAPI tests library:
---------------------
TruAPI tests library is an open source repository intended to provide and share commonly used tests.

Appreciate any feedback and additional test samples from all.

1. websocket-test-sample - a simple test that allow you to open web socket connection, echo to server 10 times and close the connection, thus creating a transaction

2. har-tester - har-tester test is meant to simulate load on server based on har(HTTP Archive format) files, that can be created using developers tools of commonly used browsers.
Current implementation take into consideration the following:
Url; Method; User Agent
Auto Correlation of cookies based on set-cookie/Set-cookie enable to pass cookies from  request to consecutive requests

Current implementation simulate several concurrent connections for static files like

this is done in order to better simulate common browsers.

Browsers are randomly chosen

Current implementation support black list - add blocked hosts to black-list.json

Current implementation support ability to override specific urls, using urlOverrides in har-tester.js file one can catch a specific
url and perform some action before of after the request, thus catching parameters/response and use in next requests.
             [
                 {
                     url: "https://someUrl.com/login",
                     beforeRequest: function (svc, urlItem, collectedCookies, Parameters) {
                         if ((undefined !== urlItem) && (undefined !== urlItem.request.url)) {
                             svc.logger.info("beforeRequest", urlItem.request.url);
                         }
                     },
                     afterRequest: function (svc, urlItem, collectedCookies, Parameters, res) {
                         if ((undefined !== urlItem) && (undefined !== urlItem.request.url)) {
                             svc.logger.info("afterRequest:", urlItem.request.url);
                         }
                     }
                 },
