// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// 
// UTIL.JS
// Put non-feature specific functions used in > 1 test file in here to share with other tests
// and simplify maintenance across tests by avoiding copy/paste.
//
"use strict";

function unhandledTestError(msg) {
    try {
        LiveUnit.Assert.fail("unhandled test exception: " + msg);
    } catch (ex) {
        // don't rethrow assertion failure exception 
    }
}

function isWinRTEnabled() {
    // detect if WinRT is available (running under WWAHOST) to enable/disable appropriate tests
    return (window && (window.Windows !== undefined));
}

function namedObjectContainsString(obj, string) {
    // loop through items inside obj and return index of match, 
    // returns -1 if no match.
    var index = 0;
    string = string.toLowerCase();
    string = string.replace("../", "");

    for (var i in obj) {
        if (i.toLowerCase().indexOf(string) >= 0) {
            return index;
        }
        index++;
    }

    return -1;
}

function enableWebunitErrorHandler(enable) {
    // if you disable the webunit error handler, it will affect all tests in the run.  
    // **MAKE SURE** you put it back per test case using finally{} blocks and or proper promise error paths as necessary.
    try {
        if (enable) {
            // restore the webunit global error handler
            window.addEventListener("error", LiveUnit.exceptionHandler, false);
        } else {
            // remove the webunit global handler which will call complete() if you encounter an error during fragment loading
            window.removeEventListener("error", LiveUnit.exceptionHandler, false);
        }
    } catch (ex) {
        // restore the webunit global error handler in case it was removed.  If already added, re-adding doesn't generate error.
        window.addEventListener("error", LiveUnit.exceptionHandler, false);
        LiveUnit.Assert.fail("unhandled exception from enableWebuniteErrorHandler(), webunit global error handler restored.  Exception=" + ex);
    }
};

if (isWinRTEnabled()) {
    // Start - GC related code
    var MemWatcher_host = new Windows.Foundation.Uri("about://blank");

    // MemWatcher is a helper that enables checking if a given JS object
    // has been garbage collected.
    var MemWatcher = {
        // Takes in a JS object that you want to track
        // Returns a reference id
        watch: function (obj) {
            var guid = WinJS.Utilities._uniqueID(document.createElement("div"));
            msSetWeakWinRTProperty(MemWatcher_host, guid, obj);
            return guid;
        },
        // Takes in the reference returned by the watch()
        // Returns the object if not GC'ed, else returns null
        find: function (id) {
            document.body.click();
            window.focus();

            for (var i = 0; i < 6; i++) {
                CollectGarbage(i);
                CollectGarbage(i);
                CollectGarbage(i);
            }

            // Note: when IE is in script debug mode, msGetWeakWinRTProperty always returns null.
            return msGetWeakWinRTProperty(MemWatcher_host, id);
        },
        // This function continuously polls to check if the object referenced by id 
        // has been garbage collected
        // Takes in the reference id of the object, total polling duration and poll interval
        // Returns a promise that succeeds if the object is GC'ed within the total poll duration
        waitAsync: function (id, totalPollTime, pollInterval) {
            var RETRY_TIME = pollInterval ? pollInterval : 500,//ms
                attempts = 0,
                totalTime = totalPollTime ? totalPollTime : 5000,//ms
                startTime = Date.now();

            LiveUnit.LoggingCore.logComment("Poll interval: " + RETRY_TIME);
            LiveUnit.LoggingCore.logComment("Total poll duration: " + totalTime);

            var promise = asyncWhile(function () {
                var elapsedTime = Date.now() - startTime;
                if (elapsedTime >= totalTime) {
                    // on timeout, cancel the promise chain.
                    return WinJS.Promise.wrapError("timeout");
                } else {
                    attempts++;
                    LiveUnit.LoggingCore.logComment("Attempt number: " + attempts);
                    LiveUnit.LoggingCore.logComment("elapsedTime: " + elapsedTime);
                    return (MemWatcher.find(id) !== null);
                }
            }, function () {
                return WinJS.Promise.timeout(RETRY_TIME);
            });

            return promise;
        }
    }
}
// End - GC related code

// A utility function that returns a function that returns a timeout promise of the given value
function weShouldWait(delay) {
    return function (value) {
        return WinJS.Promise.timeout(delay).
            then(function () {
                return value;
            });
    };
}

// A general purpose asynchronous looping function
function asyncWhile(conditionFunction, workFunction) {

    function loop() {
        return WinJS.Promise.as(conditionFunction()).
            then(function (shouldContinue) {
                if (shouldContinue) {
                    return WinJS.Promise.as(workFunction()).then(loop);
                } else {
                    return WinJS.Promise.wrap();
                }
            });
    }

    return loop();
}

var Helper;
(function (Helper) {
    
    Helper.endsWith = function endsWith(s, suffix) {
        var expectedStart = s.length - suffix.length;
        return expectedStart >= 0 && s.lastIndexOf(suffix) === expectedStart;
    };
    
    // Rounds *n* such that it has at most *decimalPoints* digits after the decimal point.
    Helper.round = function round(n, decimalPoints) {
        return Math.round(n * Math.pow(10, decimalPoints)) / Math.pow(10, decimalPoints);
    };
    
    // Returns a random integer less than the given number
    Helper.getRandomNumberUpto = function getRandomNumberUpto(num) {
        return Math.floor(Math.random() * num);
    };
    
    // Returns a random item from the given array or binding list
    Helper.getRandomItem = function getRandomItem(array) {
        var randomIndex = Helper.getRandomNumberUpto(array.length);
        if (array instanceof Array) {
            return array[randomIndex];
        } else {
            return array.getAt(randomIndex);
        }
    };
    
    Helper.enableStyleSheets = function enableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = false;
            }
        } 
    };
    
    Helper.disableStyleSheets = function disableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = true;
            }
        } 
    };
    
    // Parses an rgb/rgba string as returned by getComputedStyle. For example:
    // Input: "rgb(10, 24, 215)"
    // Output: [10, 24, 215, 1.0]
    // Input: "rgba(10, 24, 215, 0.25)"
    // Output: [10, 24, 215, 0.25]
    // Special cases the color "transparent" which IE returns when no color is specified:
    // Input: "transparent"
    // Output: [0, 0, 0, 0.0]
    Helper.parseColor = function parseColor(colorString) {
        if (colorString === "transparent") {
            return [0, 0, 0, 0.0];
        } else if (colorString.indexOf("rgb") !== 0) {
            throw "Expected a CSS rgb string but found: " + colorString;
        }
        var start = colorString.indexOf("(") + 1;
        var end = colorString.indexOf(")");
        var nums = colorString.substring(start, end).split(",");
        return [
            parseInt(nums[0].trim(), 10),
            parseInt(nums[1].trim(), 10),
            parseInt(nums[2].trim(), 10),
            nums.length < 4 ? 1.0 : parseFloat(nums[3].trim())
        ];
    };
    
    Helper.Assert = {
        areArraysEqual: function areArraysEqual(expectedArray, actualArray, message) {
            if (!expectedArray instanceof Array || !actualArray instanceof Array) {
                LiveUnit.Assert.fail(message);
            }
    
            if (expectedArray === actualArray) {
                return;
            }
    
            LiveUnit.Assert.areEqual(expectedArray.length, actualArray.length, message);
    
            for (var i = 0; i < expectedArray.length; i++) {
                LiveUnit.Assert.areEqual(expectedArray[i], actualArray[i], message);
            }
        },
    
        areSetsEqual: function areArraysEqual(expectedArray, actualArray, message) {
            var expected = expectedArray.slice().sort();
            var actual = actualArray.slice().sort();
            Helper.Assert.areArraysEqual(expected, actual, message);
        },
        
        // Verifies CSS colors. *expectedColorString* and *actualColorString* are color strings of the form
        // returned by getComputedStyle. Specifically, they can look like this:
        // - "rgb(10, 24, 215)"
        // - "rgba(10, 24, 215, 0.25)"
        areColorsEqual: function areColorsEqual(expectedColorString, actualColorString, message) {            
            var expectedColor = Helper.parseColor(expectedColorString);
            var actualColor = Helper.parseColor(actualColorString);
            // Verify red, green, blue
            Helper.Assert.areArraysEqual(expectedColor.slice(0, 3), actualColor.slice(0, 3), message);
            // Verify alpha with a tolerance of 0.05
            LiveUnit.Assert.isTrue(Math.abs(expectedColor[3] - actualColor[3]) <= .05, message);
        }
    };
    
    // Returns the group key for an item as defined by createData() below
    Helper.groupKey = function groupKey(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        return groupIndex.toString();
    };
    
    // Returns the group data for an item as defined by createData() below
    Helper.groupData = function groupData(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        var groupData = {
            title: "group" + groupIndex,
            index: groupIndex,
            itemWidth: "150px",
            itemHeight: "150px"
        };
        return groupData;
    };
    
    // Creates an array with data item objects
    Helper.createData = function createData(size) {
        var data = [];
        for (var i = 0; i < size; i++) {
            data.push({ title: "title" + i, index: i, itemWidth: "100px", itemHeight: "100px" });
        }
        return data;
    };
    
    // Creates a binding list out of the provided array (data) or
    // creates a new data array of specified size
    Helper.createBindingList = function createBindingList(size, data) {
        return (data ? new WinJS.Binding.List(data) : new WinJS.Binding.List(Helper.createData(size)));
    };
    
    // Creates a VDS out of the provided array (data) or
    // creates a new data array of specified size
    Helper.createTestDataSource = function createTestDataSource(size, data, isSynchronous) {
        // Populate a data array
        if (!data) {
            data = Helper.createData(size);
        }
        // isSynchronous defaults to true
        if (isSynchronous === undefined) {
            isSynchronous = true;
        }
    
        // Create the datasource
        var controller = {
            directivesForMethod: function (method) {
                return {
                    callMethodSynchronously: isSynchronous,
                    delay: isSynchronous ? undefined : 0,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1
                };
            }
        };
    
        // Data adapter abilities
        var abilities = {
            itemsFromIndex: true,
            itemsFromKey: true,
            remove: true,
            getCount: true,
            setNotificationHandler: true
        };
    
        return TestComponents.createTestDataSource(data, controller, abilities);
    };
    
    // Synchronous JS template for the data item created by createData() above
    Helper.syncJSTemplate = function syncJSTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var element = document.createElement("div");
            element.id = item.data.title;
            WinJS.Utilities.addClass(element, "syncJSTemplate");
            element.style.width = item.data.itemWidth;
            element.style.height = item.data.itemHeight;
            element.innerHTML = "<div>" + item.data.title + "</div>";
            return element;
        });
    };
    
    Helper.getOffsetRight = function getOffsetRight(element) {
        return element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth;
    };
    
    // Returns a promise which completes upon receiving a scroll event
    // from *element*.
    Helper.waitForScroll = function waitForScroll(element) {
        return new WinJS.Promise(function (c) {
            element.addEventListener("scroll", function onScroll() {
                element.removeEventListener("scroll", onScroll);
                c();
            });
        });
    };
        
    // Returns a promise which completes when *element* receives focus. When *includeDescendants* is true,
    // the promise completes when *element* or any of its descendants receives focus. *moveFocus* is a
    // callback which is expected to trigger the focus change that the caller is interested in. 
    Helper._waitForFocus = function focus(element, moveFocus, options) {
        options = options || {};
        var includeDescendants = options.includeDescendants;
        
        var p = new WinJS.Promise(function (complete) {
            element.addEventListener("focus", function focusHandler() {
                if (includeDescendants || document.activeElement === element) {
                    element.removeEventListener("focus", focusHandler, false);
                    complete();
                }
            }, true);
        });
        moveFocus();
        return p;
    };
    
    Helper.focus = function focus(element) {
        return Helper._waitForFocus(element, function () { element.focus(); }, {
            includeDescendants: false
        });
    };
    
    Helper.waitForFocus = function focus(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: false
        });
    };
    
    Helper.waitForFocusWithin = function focus(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: true
        });
    };
    
    // Useful for disabling tests which were generated programmatically. Disables testName which
    // is part of the testObj tests. It's safest to call this function at the bottom of the
    // appropriate test file to ensure that the test has already been defined.
    //
    // Example usage: disableTest(WinJSTests.ConfigurationTests, "testDatasourceChange_incrementalGridLayout"); 
    Helper.disableTest = function disableTest(testObj, testName) {
        var disabledName = "x" + testName;
    
        testObj[disabledName] = testObj[testName];
        delete testObj[testName];
    };    
})(Helper || (Helper = {}));
