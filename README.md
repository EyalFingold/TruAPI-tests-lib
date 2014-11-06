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

2. har-tester - a test allowing you to navigate in browser in your site, save the results as HAR file, and use this to replay it with StormRunner load on a larger scale.
    Currently i am supporting sites which don’t require login (working on adding Basic Authentication and OAUTH capabilities)
    Currently i am supporting running requests in async way similar to browsers (but imitating this assuming all requests are from same domain, need to support this for more than 1 domain)
