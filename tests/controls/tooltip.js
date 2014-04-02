// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.TooltipTests = function () {
    "use strict";
    // Initial setup for each test to create the anchor element
    function setup() {
        var newNode = document.createElement("div");
        newNode.id = "tooltipTestDiv";
        newNode.innerHTML =
                "This is a test for tooltip <span id=\"anchorElement\">hover for tooltip</span>";
        document.body.appendChild(newNode);
        return newNode;
    }

    function tearDown() {
        var tooltipElement = document.getElementById("tooltipTestDiv");
        if (tooltipElement) {
            WinJS.Utilities.disposeSubTree(tooltipElement);
            document.body.removeChild(tooltipElement);
        }
    }

    // Test Tooltip Instantiation
    this.testTooltipInstantiation = function () {
        try {
            // Set the anchor element
            LiveUnit.LoggingCore.logComment("Setting the anchor element");
            var anchorElement = setup();

            // Test tooltip insantiation
            LiveUnit.LoggingCore.logComment("Attempt to Insantiate the tooltip element");
            var tooltip = new WinJS.UI.Tooltip(anchorElement);
            LiveUnit.LoggingCore.logComment("Tooltip has been insantiated.");
            LiveUnit.Assert.isNotNull(tooltip, "Tooltip element should not be null when insantiated.");
            
            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
            verifyFunction("open");
            verifyFunction("close");
        } finally {
            tearDown();
        }

        function verifyFunction (functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (tooltip[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from tooltip");
            }

            LiveUnit.Assert.isNotNull(tooltip[functionName]);
            LiveUnit.Assert.isTrue(typeof (tooltip[functionName]) === "function", functionName + " exists on tooltip, but it isn't a function");
        }
    }

    this.testTooltipInstantiation["Owner"] = "lipinc"; // These are metadata properties you can set for your test function, use Latch to query on them
    this.testTooltipInstantiation["Priority"] = "0"; // Priority defaults to 0 if not specified.
    this.testTooltipInstantiation["Description"] = "Test Tooltip Instantiation";
    this.testTooltipInstantiation["Category"] = "Instantiation";

    // Test Tooltip Instatiation with null anchor element
    this.testTooltipNullInstatiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the tooltip with null element");
        var tooltip = null;

        try {
            tooltip = "attempting";
            tooltip = new WinJS.UI.Tooltip(null);
        } catch (e) {
            tooltip = null;
        } finally {
            LiveUnit.Assert.isNotNull(tooltip, "Tooltip should allow instantiating with a null anchor.");
            LiveUnit.Assert.isNotNull(tooltip.element, "When tooltip is instantiating with a null anchor, an anchor is generated for it.");
            tooltip.dispose();
        }
     }
    this.testTooltipNullInstatiation["Owner"] = "lipinc";
    this.testTooltipNullInstatiation["Priority"] = "1";
    this.testTooltipNullInstatiation["Description"] = "Test Tooltip Instantiation with null anchor element";
    this.testTooltipNullInstatiation["Category"] = "Instantiation";

    // Test multiple instantiation of the same anchor element
    this.testTooltipMultipleInstantiation = function () {
        try {
            var anchorElement = setup();
            var tooltip = new WinJS.UI.Tooltip(anchorElement);

            LiveUnit.LoggingCore.logComment("Attempt to Insantiate tooltip2 on the same anchor element");
            var tooltip2 = new WinJS.UI.Tooltip(anchorElement);
            LiveUnit.LoggingCore.logComment("Tooltip2 has been instantiated.");
            LiveUnit.Assert.isNotNull(tooltip2, "Tooltip2 element should not be null when instantiated.");
            LiveUnit.Assert.areEqual(tooltip, tooltip2, "Multiple calls to new WinJS.UI.Tooltip() on the same element should return the same tooltip object");
        } finally {
            tearDown();
        }
    }
    this.testTooltipMultipleInstantiation["Owner"] = "lipinc";
    this.testTooltipMultipleInstantiation["Priority"] = "1";
    this.testTooltipMultipleInstantiation["Description"] = "Test tooltip duplicate instantiation with same anchor element";
    this.testTooltipMultipleInstantiation["Category"] = "Instantiation";

    // Test tooltip parameters
    this.testTooltipParams = function () {
        function testGoodInitOption(paramName, value, actualValue) {
            try {
                LiveUnit.LoggingCore.logComment("Testing creating a tooltip using good parameter " + paramName + "=" + value);
                var anchorElement = setup();
                var options = {};
                options[paramName] = value;
                var tooltip = new WinJS.UI.Tooltip(anchorElement, options);
                LiveUnit.Assert.isTrue(tooltip[paramName] === actualValue, paramName + " should be set to " + actualValue);
            } finally {
                tearDown();
            }
        }

        function testBadInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a tooltip using bad parameter " + paramName + "=" + value);
            var anchorElement = setup();
            var options = {};
            options[paramName] = value;
            var exception = null;
            try {
                new WinJS.UI.Tooltip(anchorElement, options);
            } catch (e) {
                exception = e;
            } finally {
                tearDown();
                LiveUnit.LoggingCore.logComment(exception !== null);
                LiveUnit.LoggingCore.logComment(exception.message);
                LiveUnit.Assert.isTrue(exception !== null);
                LiveUnit.Assert.isTrue(exception.name === "Error");
            }
        }

        testGoodInitOption("placement", "bottom", "bottom");
        testGoodInitOption("innerHTML", "<B>Header of my tip</B><BR>Main text of my tip3", "<B>Header of my tip</B><BR>Main text of my tip3");
        //testBadInitOption("placement", "Top");
        //testBadInitOption("placement", "lipinc");
    }

    this.testTooltipParams["Owner"] = "lipinc";
    this.testTooltipParams["Priority"] = "1";
    this.testTooltipParams["Description"] = "Test initializing a tooltip with good and bad initialization options";
    this.testTooltipParams["Category"] = "Instantiation";


    // Simple Function Tests
    this.testSimpleTooltipFunctions = function () {
        try {
            var anchorElement = setup();
            var tooltip = new WinJS.UI.Tooltip(anchorElement);
            LiveUnit.Assert.isNotNull(tooltip, "Tooltip element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("open");
            tooltip.open();

            LiveUnit.LoggingCore.logComment("close");
            tooltip.close();
        } finally {
            tearDown();
        }
    }
    this.testSimpleTooltipFunctions["Owner"] = "lipinc";
    this.testSimpleTooltipFunctions["Priority"] = "1";
    this.testSimpleTooltipFunctions["Description"] = "Test simple tooltip functions";
    this.testSimpleTooltipFunctions["Category"] = "Instantiation";
    
    // Tests for dispose members and requirements
    this.testTooltipDispose = function () {
        try {
            var anchorElement = setup();
            var tt = new WinJS.UI.Tooltip(anchorElement, { innerHTML: "<div></div>" });
            tt.open();
            LiveUnit.Assert.isTrue(tt.dispose);
            LiveUnit.Assert.isFalse(tt._disposed);
            
            tt.addEventListener("click", function () {
                LiveUnit.Assert.fail();
            });

            // Double dispose sentinel
            var sentinel = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            tt._domElement.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            tt.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(tt._disposed);
            LiveUnit.Assert.isFalse(WinJS.Utilities.data(anchorElement).tooltip);
            anchorElement.click();
            tt.dispose();
        } finally {
            tearDown();
        }
    }
    this.testTooltipDispose["Owner"] = "seanxu";
    this.testTooltipDispose["Description"] = "Tooltip dispose test";
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.TooltipTests");
