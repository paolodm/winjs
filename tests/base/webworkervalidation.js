// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <deploy src="../TestData/" />

(function (global) {
    "use strict";

    if (global.LiveUnit) {
        global.CorsicaTests = global.CorsicaTests || {};

        global.CorsicaTests.WebWorkerValidationTests = function () {
            this.testBasicLoad = function (complete) {
                var worker = new Worker("webworkervalidation.js");
                worker.onerror = function (err) {
                    LiveUnit.Assert.fail(err);
                }
                worker.onmessage = function (msg) {
                    LiveUnit.Assert.areEqual(1, msg.data.x);
                    LiveUnit.Assert.areEqual(5, msg.data.y);
                    LiveUnit.Assert.areEqual(undefined, msg.data.z);
                    complete();
                }
            }
        }

        global.LiveUnit.registerTestClass("CorsicaTests.WebWorkerValidationTests");
    }
    else {
        // running in the worker context
        importScripts("webworkerscript.js");
        var Point = WinJS.Class.define(function () { }, { x: 0, y: 5 });
        var pt = new Point();
        pt.x = 1;
        postMessage({ x: pt.x, y: pt.y, z: pt.z });
    }
})(this);