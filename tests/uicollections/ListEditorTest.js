// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <reference path="../TestLib/ItemsManager/TestDataSource.js" />
/// <reference path="../TestLib/ItemsManager/UnitTestsCommon.js" />
/// <deploy src="../TestData/" />

var WinJSTests = WinJSTests || {};

WinJSTests.ListEditorTest = function () {
    "use strict";

    var ITEMS_COUNT = 10,
        bigDataSet = [];

    // This is the setup function that will be called at the beginning of each test function.
    this.setUp = function (complete) {
        LiveUnit.LoggingCore.logComment("In setup");
        var newNode = document.createElement("div");
        newNode.id = "ListEditorTest";
        newNode.innerHTML =
            "<div id='listEditorTest' style='width:400px; height:300px'></div>" +
            "<div id='simpleTemplate' class='listEditorTestClass' style='display: none; width:100px; height:100px'>" +
            "   <div>{{title}}</div>" +
            "</div>";
        document.body.appendChild(newNode);

        for (var i = 0; i < 100; ++i) {
            bigDataSet[i] = { title: "Tile" + i };
        }
        appendCSSFileToHead("$(TESTDATA)/Listview.css").then(complete);
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");

        var element = document.getElementById("ListEditorTest");
        if (element) {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        }
        removeCSSFileFromHead("$(TESTDATA)/Listview.css");
    }

    function setupListView(element, layoutName, items, useBindingList, async) {
        if (!items) {
            items = [];
            for (var i = 0; i < ITEMS_COUNT; ++i) {
                items[i] = { title: "Tile" + i };
            }
        }

        var dataSource;
        if (useBindingList) {
            dataSource = new WinJS.Binding.List(items.slice(0)).dataSource;
        } else if (!async) {
            dataSource = TestComponents.simpleSynchronousArrayDataSource(items.slice(0));
        } else {
            var controller = {
                directivesForMethod: function (method, args) {
                    return {
                        callMethodSynchronously: false,
                        sendChangeNotifications: true,
                        countBeforeDelta: 0,
                        countAfterDelta: 0,
                        countBeforeOverride: -1,
                        countAfterOverride: -1,
                        delay: 10
                    };
                }
            };
            dataSource = TestComponents.createTestDataSource(items.slice(0), controller, null);
        }

        return new WinJS.UI.ListView(element, {
            layout: new WinJS.UI[layoutName](),
            itemDataSource: dataSource,
            selectionMode: "multi",
            itemTemplate: createRenderer("simpleTemplate")
        });
    }

    this.generate = function (name, testFunction, items) {
        function generateTest(that, layoutName, useBindingList, async) {
            var fullName = name + "In" + layoutName + (useBindingList ? '_BindingList' : '_VirtualDataSource') + (async ? '_Async' : '');
            that[fullName] = function (complete) {
                LiveUnit.LoggingCore.logComment("in " + fullName);

                var element = document.getElementById("listEditorTest");
                var listview = setupListView(element, layoutName, items, useBindingList, async);

                testFunction(listview, complete);
            };
        }
        generateTest(this, "GridLayout", true);
        generateTest(this, "GridLayout", false);
        generateTest(this, "GridLayout", false, true);
    }

    function checkTile(listview, index, text) {
        var tile = listview.elementFromIndex(index);
        LiveUnit.Assert.areEqual(text, tile.textContent.trim());
    }

    this.generate("testInsert", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testInsert");

        var tests = [
            function () {
                listView.selection.set(0);
                listView.selection._pivot = 1;
                getDataObjects(listView.itemDataSource, [0]).then(function (dataObjects) {
                    listView.itemDataSource.beginEdits();
                    listView.itemDataSource.insertBefore(null, { title: "NewTile" }, dataObjects[0].key);
                    listView.itemDataSource.insertBefore(null, { title: "NewTile" }, dataObjects[0].key);
                    listView.itemDataSource.endEdits();
                });
                return true;
            },
            function () {
                elementsEqual([2], listView.selection.getIndices());
                checkTile(listView, 0, "NewTile");
                checkTile(listView, 1, "NewTile");
                LiveUnit.Assert.areEqual(3, listView.selection._pivot, "Selection pivot incorrect after insertions");

                listView.itemDataSource.insertAtEnd(null, { title: "LastTile" });
                return true;
            },
            function () {
                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(ITEMS_COUNT + 3, count);
                    LiveUnit.Assert.areEqual(ITEMS_COUNT + 3, document.querySelectorAll(".listEditorTestClass").length - 1);
                    checkTile(listView, count - 1, "LastTile");
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    });


    this.generate("testInsertToEmpty", function (listView, complete) {
        var tests = [
            function () {
                listView.itemDataSource.beginEdits();
                listView.itemDataSource.insertAtStart(null, { title: "LastTile" });
                listView.itemDataSource.insertAtStart(null, { title: "NewTile" });
                listView.itemDataSource.insertAtStart(null, { title: "FirstTile" });
                listView.itemDataSource.endEdits();
                return true;
            },
            function () {
                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(3, count);
                    LiveUnit.Assert.areEqual(3, document.querySelectorAll(".listEditorTestClass").length - 1);
                    checkTile(listView, 0, "FirstTile");
                    checkTile(listView, count - 1, "LastTile");
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    }, []);

    this.generate("testInsertToEmptyAtEnd", function (listView, complete) {
        var tests = [
            function () {
                listView.itemDataSource.beginEdits();
                listView.itemDataSource.insertAtEnd(null, { title: "FirstTile" });
                listView.itemDataSource.insertAtEnd(null, { title: "NewTile" });
                listView.itemDataSource.insertAtEnd(null, { title: "LastTile" });
                listView.itemDataSource.endEdits();
                return true;
            },
            function () {
                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(3, count);
                    LiveUnit.Assert.areEqual(3, document.querySelectorAll(".listEditorTestClass").length - 1);

                    checkTile(listView, 0, "FirstTile");
                    checkTile(listView, count - 1, "LastTile");
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    }, []);

    this.generate("testDelete", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testDelete");

        var tests = [
            function () {
                listView.selection.set([0, 1, 2]);
                listView.selection._pivot = 2;

                listView.addEventListener("selectionchanging", function (eventObject) {
                    elementsEqual([0, 1], eventObject.detail.newSelection.getIndices());
                }, false);

                listView.addEventListener("selectionchanged", function (eventObject) {
                    elementsEqual([0, 1], listView.selection.getIndices());
                }, false);

                getDataObjects(listView.itemDataSource, [1, 3]).then(function (dataObjects) {
                    listView.itemDataSource.remove(dataObjects[0].key);
                    listView.itemDataSource.remove(dataObjects[1].key);
                });
                return true;
            },
            function () {
                elementsEqual([0, 1], listView.selection.getIndices());
                checkTile(listView, 0, "Tile0");
                checkTile(listView, 1, "Tile2");
                checkTile(listView, 2, "Tile4");
                LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Selection pivot incorrect after deletions");

                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, count);
                    LiveUnit.Assert.areEqual(ITEMS_COUNT - 2, document.querySelectorAll(".listEditorTestClass").length - 1);
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    });

    this.generate("testDeleteAll", function (listView, complete) {
        var tests = [
            function () {
                listView.selection._pivot = 2;
                listView.itemDataSource.getCount().then(function (count) {
                    LiveUnit.Assert.areEqual(document.querySelectorAll(".listEditorTestClass").length - 1, count);

                    var promises = [];
                    listView.itemDataSource.beginEdits();
                    for (var i = count - 1; i >= 0; i--) {
                        promises.push(listView.itemDataSource.itemFromIndex(i).then(function (item) {
                            listView.itemDataSource.remove(item.key);
                        }));
                    }
                    WinJS.Promise.join(promises).then(function () {
                        listView.itemDataSource.endEdits();
                    });
                });
                return true;
            },
            function () {
                listView.itemDataSource.getCount().then(function (count) {
                    LiveUnit.Assert.areEqual(0, count);
                    LiveUnit.Assert.areEqual(0, document.querySelectorAll(".listEditorTestClass").length - 1);
                    LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, listView.selection._pivot, "Selection pivot should be cleared aftering emptying the list");
                    complete();
                });
            }
        ];
        runTests(listView, tests);
    });

    this.generate("testDeleteAllWithoutBatching", function (listView, complete) {
        var tests = [
            function () {
                listView.itemDataSource.getCount().then(function (count) {
                    LiveUnit.Assert.areEqual(count, listView.element.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(count, listView.element.querySelectorAll(".win-item").length);

                    for (var i = count - 1; i >= 0; i--) {
                        listView.itemDataSource.itemFromIndex(i).then(function (item) {
                            listView.itemDataSource.remove(item.key);
                        });
                    }
                });
                return true;
            },
            function () {
                listView.itemDataSource.getCount().then(function (count) {
                    LiveUnit.Assert.areEqual(0, count);
                    LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".win-container").length);
                    LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".win-item").length);
                    complete();
                });
            }
        ];
        runTests(listView, tests);
    });

    this.generate("testDeleteAllAndInsert", function (listView, complete) {
        var tests = [
            function () {
                listView.ensureVisible(99);
            },
            function () {
                listView.itemDataSource.getCount().then(function (count) {
                    var promises = [];
                    listView.itemDataSource.beginEdits();
                    for (var i = count - 1; i >= 0; i--) {
                        promises.push(listView.itemDataSource.itemFromIndex(i).then(function (item) {
                            listView.itemDataSource.remove(item.key);
                        }));
                    }
                    WinJS.Promise.join(promises).then(function () {
                        listView.itemDataSource.insertAtStart(null, { title: "Tile" + 1 });
                        listView.itemDataSource.insertAtStart(null, { title: "Tile" + 0 });
                        listView.itemDataSource.endEdits();
                    });
                });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(0, listView.element.querySelectorAll(".listEditorTestClass").length);
                return true;
            },
            function () {
                listView.itemDataSource.getCount().
                    done(function (count) {
                        LiveUnit.Assert.areEqual(2, count);
                        LiveUnit.Assert.areEqual(2, listView.element.querySelectorAll(".listEditorTestClass").length);
                        LiveUnit.Assert.areEqual(0, listView.indexOfFirstVisible);
                        complete();
                    });
                return true;
            }
        ];
        runTests(listView, tests);
    }, bigDataSet);

    this.generate("testDeleteSelectionPivot", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testDeleteSelectionPivot");

        var tests = [
            function () {
                listView.selection._pivot = 1;
                getDataObjects(listView.itemDataSource, [0, 1, 2, 3]).then(function (dataObjects) {
                    listView.itemDataSource.beginEdits();
                    listView.itemDataSource.remove(dataObjects[0].key);
                    listView.itemDataSource.remove(dataObjects[1].key);
                    listView.itemDataSource.remove(dataObjects[2].key);
                    listView.itemDataSource.remove(dataObjects[3].key);
                    listView.itemDataSource.endEdits();
                });
                return true;
            },
            function () {
                LiveUnit.Assert.areEqual(1, listView.selection._pivot, "Selection pivot incorrect after deletions");
                complete();
            }
        ];
        runTests(listView, tests);
    });

    this.generate("testUpdate", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testUpdate");

        var tests = [
            function () {
                getDataObjects(listView.itemDataSource, [1]).then(function (dataObjects) {
                    listView.itemDataSource.change(dataObjects[0].key, { title: "UpdatedTile" });
                });
                return true;
            },
            function () {
                checkTile(listView, 1, "UpdatedTile");

                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    });
    // Validate that after updating the content of a selected item:
    // - Its selection visual is still rendered
    // - aria-selected is still "true"
    this.generate("testUpdateSelectedItem", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testUpdateSelectedItem");

        function validateItemSelection(itemIndex, selected, context) {
            var items = listView._view.items,
                itemBox = items.itemBoxAt(itemIndex),
                visualRendered = WinJS.UI._isSelectionRendered(itemBox),
                ariaSelected = items.itemAt(itemIndex).getAttribute("aria-selected");

            LiveUnit.Assert.areEqual(selected, visualRendered, "Selection visual should be rendered " + context);
            LiveUnit.Assert.areEqual(selected, ariaSelected === "true", "aria-selected should be true " + context);
            LiveUnit.Assert.areEqual(selected, utilities.hasClass(itemBox, WinJS.UI._selectedClass));
        }

        var tests = [
            function () {
                listView.selection.add(0).then(function () {
                    validateItemSelection(0, true, "after selecting the item");
                    validateItemSelection(1, false, "after selecting the item");
                    getDataObjects(listView.itemDataSource, [0, 1]).then(function (dataObjects) {
                        listView.itemDataSource.change(dataObjects[0].key, { title: "UpdatedTile0" });
                        listView.itemDataSource.change(dataObjects[1].key, { title: "UpdatedTile1" });
                    });
                });
                return true;
            },
            function () {
                checkTile(listView, 0, "UpdatedTile0");
                checkTile(listView, 1, "UpdatedTile1");
                validateItemSelection(0, true, "after updating the item's content");
                validateItemSelection(1, false, "after updating the item's content");

                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    });

    this.generate("testMove", function (listView, complete) {
        LiveUnit.LoggingCore.logComment("in testMove");

        var tests = [
            function () {
                listView.selection.set(1);
                listView.selection._pivot = 1;
                getDataObjects(listView.itemDataSource, [0, 1]).then(function (dataObjects) {
                    listView.itemDataSource.moveBefore(dataObjects[1].key, dataObjects[0].key);
                });
                return true;
            },
            function () {
                elementsEqual([0], listView.selection.getIndices());
                checkTile(listView, 0, "Tile1");
                checkTile(listView, 1, "Tile0");
                LiveUnit.Assert.areEqual(0, listView.selection._pivot, "Selection pivot incorrect after move");

                getDataObjects(listView.itemDataSource, [1]).then(function (dataObjects) {
                    listView.itemDataSource.moveToEnd(dataObjects[0].key);
                });

                return true;
            },
            function () {

                listView.itemDataSource.getCount().then(LiveUnit.GetWrappedCallback(function (count) {
                    LiveUnit.Assert.areEqual(ITEMS_COUNT, count);
                    checkTile(listView, count - 1, "Tile0");
                    complete();
                }));
            }
        ];
        runTests(listView, tests);
    });

    this.generateInsertAtEndWithRefresh = function (layoutName) {
        this["testInsertAtEndWithRefresh" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {

            var INITAL_COUNT = 2,
                FINAL_COUNT = 100,
                itemsCount = INITAL_COUNT;

            function createDataSource() {
                var dataSource = {
                    itemsFromIndex: function (index, countBefore, countAfter) {
                        var startIndex = Math.max(0, index - countBefore),
                            endIndex = Math.min(index + countAfter, itemsCount - 1),
                            size = endIndex - startIndex + 1;

                        var items = [];
                        for (var i = startIndex; i < startIndex + size; i++) {
                            items.push({
                                key: i.toString(),
                                data: {
                                    title: "Tile" + i
                                }
                            });
                        }

                        return WinJS.Promise.wrap({
                            items: items,
                            offset: index - startIndex,
                            totalCount: itemsCount,
                            absoluteIndex: index
                        });
                    },

                    getCount: function () {
                        return WinJS.Promise.wrap(itemsCount);
                    }
                };

                return new WinJS.UI.ListDataSource(dataSource);
            }

            var listView = new WinJS.UI.ListView(document.getElementById("listEditorTest"), {
                layout: new WinJS.UI[layoutName](),
                itemDataSource: createDataSource(),
                itemTemplate: createRenderer("simpleTemplate")
            });

            var tests = [
                function () {
                    LiveUnit.Assert.areEqual(INITAL_COUNT, document.querySelectorAll(".listEditorTestClass").length - 1);
                    checkTile(listView, 0, "Tile0");
                    checkTile(listView, 1, "Tile1");

                    itemsCount = FINAL_COUNT;
                    listView.itemDataSource.invalidateAll();
                    return true;
                },
                function () {
                    LiveUnit.Assert.isTrue((document.querySelectorAll(".listEditorTestClass").length - 1) >= 12);
                    checkTile(listView, 0, "Tile0");
                    checkTile(listView, 1, "Tile1");
                    checkTile(listView, 2, "Tile2");
                    checkTile(listView, 11, "Tile11");

                    complete();
                }
            ];
            runTests(listView, tests);
        };
    };
    this.generateInsertAtEndWithRefresh("GridLayout");

    this.generateReload = function (layoutName) {
        this["testReload" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            function test() {
                var element = document.getElementById("listEditorTest");
                var listView = setupListView(element, layoutName);
                listView.selection.set(0);

                return new WinJS.Promise(function (c) {
                    var tests = [
                    function () {
                        listView.currentItem = { index: 4 };
                        LiveUnit.Assert.areEqual(4, listView.currentItem.index, "ListView's currentItem wasn't set properly");
                        listView.selection._pivot = 1;
                        checkTile(listView, 0, "Tile0");
                        checkTile(listView, 1, "Tile1");
                        elementsEqual([0], listView.selection.getIndices());

                        var items = [];
                        for (var i = 0; i < 10; ++i) {
                            items[i] = {
                                key: i.toString(),
                                data: { title: "NewTile" + i }
                            }
                        }
                        listView.itemDataSource.testDataAdapter.replaceItems(items);
                        listView.itemDataSource.testDataAdapter.reload();
                    },
                    function () {
                        validateResetFocusState(listView, "after calling reload");
                        LiveUnit.Assert.areEqual(WinJS.UI._INVALID_INDEX, listView.selection._pivot, "Selection pivot wasn't reset during reload");
                        checkTile(listView, 0, "NewTile0");
                        checkTile(listView, 1, "NewTile1");
                        elementsEqual([], listView.selection.getIndices());

                        c();
                    }];
                    runTests(listView, tests);
                });
            }

            test().done(complete);
        };
    };
    this.generateReload("GridLayout");

    this.testSelectionChangeDuringEdits = function (complete) {
        var element = document.getElementById("listEditorTest");
        var listView = setupListView(element, "GridLayout", null, true);
        listView.selection.set([0, 1]);

        function checkTile(listview, index, text, selected) {
            var tile = listview.elementFromIndex(index),
                wrapper = tile.parentNode;
            LiveUnit.Assert.areEqual(text, tile.textContent.trim());
            // Verify win-container element and win-itembox element have the selected class for new and old layouts.
            LiveUnit.Assert.areEqual(selected, utilities.hasClass(wrapper, WinJS.UI._selectedClass));
            if (utilities.hasClass(wrapper.parentNode, WinJS.UI._containerClass)) {
                LiveUnit.Assert.areEqual(selected, utilities.hasClass(wrapper.parentNode, WinJS.UI._selectedClass));
            }
            // Verify selection elements
            LiveUnit.Assert.areEqual(selected, WinJS.UI._isSelectionRendered(wrapper));
        }

        var tests = [
        function () {
            checkTile(listView, 0, "Tile0", true);
            checkTile(listView, 1, "Tile1", true);
            checkTile(listView, 2, "Tile2", false);
            elementsEqual([0, 1], listView.selection.getIndices());

            listView.selection.clear();
            listView.itemDataSource.list.splice(0, 1);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile1", false);
            checkTile(listView, 1, "Tile2", false);
            elementsEqual([], listView.selection.getIndices());

            listView.selection.set([0, 1]);
            checkTile(listView, 0, "Tile1", true);
            checkTile(listView, 1, "Tile2", true);
            checkTile(listView, 2, "Tile3", false);
            elementsEqual([0, 1], listView.selection.getIndices());

            listView.itemDataSource.list.splice(0, 1);
            listView.selection.clear();
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile2", false);
            checkTile(listView, 1, "Tile3", false);
            elementsEqual([], listView.selection.getIndices());

            listView.selection.set([0, 1]);
            checkTile(listView, 0, "Tile2", true);
            checkTile(listView, 1, "Tile3", true);
            checkTile(listView, 2, "Tile4", false);
            elementsEqual([0, 1], listView.selection.getIndices());

            listView.itemDataSource.list.splice(0, 1);
            listView.selection.set(2);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile3", false);
            checkTile(listView, 1, "Tile4", false);
            checkTile(listView, 2, "Tile5", true);
            elementsEqual([2], listView.selection.getIndices());

            listView.itemDataSource.list.splice(0, 1);
            listView.selection.add(0);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile4", true);
            checkTile(listView, 1, "Tile5", true);
            checkTile(listView, 2, "Tile6", false);
            elementsEqual([0, 1], listView.selection.getIndices());

            listView.itemDataSource.list.splice(0, 1);
            listView.selection.remove(0);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile5", false);
            checkTile(listView, 1, "Tile6", false);
            elementsEqual([], listView.selection.getIndices());

            // Regression test for WinBlue: 100985
            //
            listView.selection.set({ firstIndex: 0, lastIndex: 2 });
            checkTile(listView, 0, "Tile5", true);
            checkTile(listView, 1, "Tile6", true);
            checkTile(listView, 2, "Tile7", true);

            listView.itemDataSource.list.move(1, 3);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile5", true);
            checkTile(listView, 1, "Tile7", true);
            checkTile(listView, 2, "Tile8", false);
            checkTile(listView, 3, "Tile6", false);
            elementsEqual([0, 1], listView.selection.getIndices());

            // Regression test for WinBlue: 100985
            //
            listView.selection.set({ firstIndex: 0, lastIndex: 2 });
            checkTile(listView, 0, "Tile5", true);
            checkTile(listView, 1, "Tile7", true);
            checkTile(listView, 2, "Tile8", true);

            listView.itemDataSource.list.move(2, 3);
            return true;
        },
        function () {
            checkTile(listView, 0, "Tile5", false);
            checkTile(listView, 1, "Tile7", false);
            checkTile(listView, 2, "Tile6", false);
            checkTile(listView, 3, "Tile8", false);
            elementsEqual([], listView.selection.getIndices());

            complete();
        }];
        runTests(listView, tests);
    };

    // Verifies that when a batch of edits consists of a delete and a move of an item from
    // the unrealized range to the realized range, the moved item gets realized.
    // Regression test for WinBlue#212707
    this.testDeleteWithMoveFromUnrealizedRange = function (complete) {
        var element = document.getElementById("listEditorTest");
        var items = [];
        for (var i = 0; i < 500; ++i) {
            items[i] = { title: "Tile" + i };
        }
        var listView = setupListView(element, "ListLayout", items, true);

        var tests = [
        function () {
            checkTile(listView, 2, "Tile2");

            listView.itemDataSource.list.shift();
            listView.itemDataSource.list.move(300, 2);
            return true;
        },
        function () {
            checkTile(listView, 2, "Tile301");
            complete();
        }];
        runTests(listView, tests);
    };

    this.generateTestDeleteWrapperSizeDuringAnimation = function (layoutName) {
        this.testDeleteWrapperSizeDuringAnimation = function (complete) {
            var element = document.getElementById("listEditorTest");
            var listView = setupListView(element, layoutName, null, true);

            var tests = [
            function () {
                checkTile(listView, 0, "Tile0", true);
                checkTile(listView, 1, "Tile1", true);
                checkTile(listView, 2, "Tile2", false);

                LiveUnit.Assert.areEqual("", listView._deleteWrapper.style.minHeight);
                LiveUnit.Assert.areEqual("0px", listView._deleteWrapper.style.minWidth);
                LiveUnit.Assert.areEqual("400px", window.getComputedStyle(listView._canvas).width);

                var oldExecuteAnimations = listView._layout.executeAnimations;
                listView._layout.executeAnimations = function () {
                    LiveUnit.Assert.areEqual("", listView._deleteWrapper.style.minHeight);
                    LiveUnit.Assert.areEqual("400px", listView._deleteWrapper.style.minWidth);
                    oldExecuteAnimations();
                    listView._layout.executeAnimations = oldExecuteAnimations();
                };
                listView.itemDataSource.list.splice(0, 1);
                return true;
            },
            function () {
                checkTile(listView, 0, "Tile1", false);
                checkTile(listView, 1, "Tile2", false);
                checkTile(listView, 2, "Tile3", false);
                LiveUnit.Assert.areEqual("", listView._deleteWrapper.style.minHeight);
                LiveUnit.Assert.areEqual("0px", listView._deleteWrapper.style.minWidth);
                complete();
            }];
            runTests(listView, tests);
        };
    };
    this.generateTestDeleteWrapperSizeDuringAnimation("GridLayout");

    // Try changing the data source while the original data source is in the middle
    // of sending out change notifications. editingFn is a function which represents
    // the change operation that is occurring on the original data source.
    function testDataSourceChangeDuringNotifications(layoutName, complete, editingFn) {
        function checkTile(listview, index, text, selected) {
            var tile = listview.elementFromIndex(index),
                wrapper = tile.parentNode;
            LiveUnit.Assert.areEqual(text, tile.textContent.trim());
            LiveUnit.Assert.areEqual(selected, utilities.hasClass(wrapper, WinJS.UI._selectedClass));
        }

        var element = document.getElementById("listEditorTest"),
            listView = setupListView(element, layoutName, null, false),
            testDataAdapter = listView.itemDataSource.testDataAdapter,
            items = [],
            newItemCounter = -1,
            i;

        for (i = 0; i < ITEMS_COUNT; ++i) {
            items[i] = { title: "NewTile" + i };
        }

        var list = new WinJS.Binding.List(items);

        var tests = [
        function () {
            checkTile(listView, 0, "Tile0", false);
            checkTile(listView, 1, "Tile1", false);
            checkTile(listView, 2, "Tile2", false);
            checkTile(listView, 3, "Tile3", false);

            testDataAdapter.directives.sendChangeNotifications = true;
            testDataAdapter.beginModifications();
            editingFn(testDataAdapter);
        },
        function () {
            listView.itemDataSource = list.dataSource;

            // Because the data source changed, ListView should ignore these
            editingFn(testDataAdapter);
            testDataAdapter.endModifications();

            return true;
        },
        function () {
            checkTile(listView, 0, "NewTile0", false);
            checkTile(listView, 1, "NewTile1", false);
            checkTile(listView, 2, "NewTile2", false);
            checkTile(listView, 3, "NewTile3", false);
            complete();
        }];
        runTests(listView, tests);
    }

    // Execute the above test once for each type of editing
    // operation: changes, insertions, moves, and removals
    this.generateDataSourceChangeDuringNotifications_change = function (layoutName) {
        this["testDataSourceChangeDuringNotifications_change" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var index = 0;

            testDataSourceChangeDuringNotifications(layoutName, complete, function (testDataAdapter) {
                testDataAdapter.changeAtIndex(index, { tile: "ChangedTile" + index });
                index++;
            });
        };
    };
    this.generateDataSourceChangeDuringNotifications_change("GridLayout");

    this.generateDataSourceChangeDuringNotifications_insert = function (layoutName) {
        this["testDataSourceChangeDuringNotifications_insert" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            var newItemCounter = -1;

            testDataSourceChangeDuringNotifications(layoutName, complete, function (testDataAdapter) {
                testDataAdapter.insertAtIndex({ tile: "Tile" + newItemCounter-- }, 0);
            });
        };
    };
    this.generateDataSourceChangeDuringNotifications_insert("GridLayout");

    this.generateDataSourceChangeDuringNotifications_move = function (layoutName) {
        this["testDataSourceChangeDuringNotifications_move" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            testDataSourceChangeDuringNotifications(layoutName, complete, function (testDataAdapter) {
                testDataAdapter.moveToIndex(5, 0);
            });
        };
    };
    this.generateDataSourceChangeDuringNotifications_move("GridLayout");

    this.generateDataSourceChangeDuringNotifications_remove = function (layoutName) {
        this["testDataSourceChangeDuringNotifications_remove" + (layoutName == "GridLayout" ? "" : layoutName)] = function (complete) {
            testDataSourceChangeDuringNotifications(layoutName, complete, function (testDataAdapter) {
                testDataAdapter.removeAtIndex(0);
            });
        };
    };
    this.generateDataSourceChangeDuringNotifications_remove("GridLayout");


    this.generateHiddenListViewTest = function (name, testFunction) {
        var that = this;

        function groupKey(data) {
            return data.group.toString();
        }

        function groupData(data) {
            return {
                title: data.group.toString()
            };
        }

        function renderer(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.textContent = item.data.title;
                element.style.width = element.style.height = "100px";
                return element;
            });
        }

        function generateTest(layoutName, groups) {
            var fullName = "test" + name + "OnHiddenListViewIn" + layoutName + (groups ? "WithGroups" : "");
            that[fullName] = function (complete) {
                initUnhandledErrors();

                var element = document.getElementById("listEditorTest");
                element.style.display = "none";

                var layout = new WinJS.UI[layoutName]();

                var items = [];
                for (var i = 0; i < 100; ++i) {
                    items[i] = {
                        title: "Tile" + i,
                        group: Math.floor(i / 10)
                    };
                }
                var list = new WinJS.Binding.List(items);

                var listView;
                if (groups) {
                    var myGroupedList = list.createGrouped(groupKey, groupData);
                    listView = new WinJS.UI.ListView(element, {
                        itemDataSource: myGroupedList.dataSource,
                        groupDataSource: myGroupedList.groups.dataSource,
                        itemTemplate: renderer,
                        groupHeaderTemplate: renderer,
                        layout: layout
                    });
                } else {
                    listView = new WinJS.UI.ListView(element, {
                        itemDataSource: list.dataSource,
                        itemTemplate: renderer,
                        layout: layout
                    });
                }

                waitForReady(listView, -1)().
                    then(function () {
                        return testFunction(listView, list);
                    }).
                    then(function () {
                        return WinJS.Promise.timeout(500);
                    }).
                    then(validateUnhandledErrorsOnIdle).
                    done(complete);
            };
        }

        generateTest("GridLayout", false);
        generateTest("ListLayout", false);
        generateTest("GridLayout", true);
    }

    this.generateHiddenListViewTest("Insert", function (listView, list) {
        list.splice(0, 0, { title: "NewTile", group: 0 });
    });

    this.generateHiddenListViewTest("Delete", function (listView, list) {
        list.splice(0, 1);
    });

    this.generateHiddenListViewTest("Move", function (listView, list) {
        list.move(0, 2);
    });

    this.generateHiddenListViewTest("Change", function (listView, list) {
        list.setAt(0, { title: "UpdatedTile", group: 0 });
    });

    this.testMoveFocusedItemBeforeReady = function (complete) {
        function renderer(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.textContent = item.data.title;
                element.style.width = element.style.height = "200px";
                return element;
            });
        }

        var element = document.getElementById("listEditorTest");
        var data = [];
        for (var i = 0; i < 1000; i++) {
            data.push({ title: "Item" + i });
        }
        var bindingList = new WinJS.Binding.List(data);
        var listView = new WinJS.UI.ListView(element, {
            itemDataSource: bindingList.dataSource,
            itemTemplate: renderer,
            indexOfFirstVisible: 500
        });

        var delayedRequests = [];
        var delayRequests = false;
        var realRequestItem = listView._view.items.requestItem.bind(listView._view.items);
        listView._onFocusIn = function () { };
        listView._onFocusOut = function () { };
        listView._view.items.requestItem = function (index) {
            if (delayRequests) {
                var signal = new WinJS._Signal();
                delayedRequests.push({ index: index, complete: signal.complete.bind(signal) });
                return signal.promise;
            }
            return realRequestItem(index);
        };
        function flushRequests() {
            for (var i = 0; i < delayedRequests.length; i++) {
                realRequestItem(delayedRequests[i].index).then(function (item) {
                    delayedRequests[i].complete(item);
                });
            }
            delayedRequests = [];
        }

        var setCurrent = false;
        listView.addEventListener("loadingstatechanged", function () {
            if (listView.loadingState === "complete") {
                if (!setCurrent) {
                    setCurrent = true;
                    delayRequests = true;
                    listView.currentItem = { index: 500, hasFocus: true };
                    bindingList.splice(499, 0, { title: "InsertedItem0" });
                    bindingList.splice(499, 0, { title: "InsertedItem1" });
                } else {
                    delayRequests = false;
                    flushRequests();
                    var item = listView.elementFromIndex(listView._selection._getFocused().index);
                    LiveUnit.Assert.isTrue(item);
                    LiveUnit.Assert.areEqual(item, listView._tabManager.childFocus, "The ListView's element at its focused index should be the tabmanager's child focus");
                    complete();
                }
            }
        });
    };

    this.testThatUpdateAffectedRangeIsMakingUnionsCorrectly = function (complete) {
        // This test makes a list modification to trigger listview layout, then makes another modification to cause listview layout to cancel and reset.
        // This test is testing that the new ListView_affectedRange property is an accurate union of the 2 original modifications when layour is called
        // as part of the reset after being canceled.

        function renderer(itemPromise) {
            return itemPromise.then(function (item) {
                var element = document.createElement("div");
                element.textContent = item.data.title;
                element.style.width = element.style.height = "200px";
                return element;
            });
        }

        var element = document.getElementById("listEditorTest");

        var data = [];
        for (var i = 0; i < 100; i++) {
            data.push({ title: "Item" + i });
        }
        var list = new WinJS.Binding.List(data);

        var listView = new WinJS.UI.ListView(element, {
            itemDataSource: list.dataSource,
            itemTemplate: renderer,
            layout: {
                initialize: function (site, groups) {
                    return "vertical";
                },
                layout: function (tree, range) {
                    return new WinJS.Promise(function (testPromiseComplete) {
                        var c = testPromiseComplete;
                        if (unionTester.interruptLayout) {
                            WinJS.Utilities._setImmediate(function () {
                                unionTester.interruptLayout();
                                unionTester.interruptLayout = null;
                            });
                        } else {
                            if (unionTester.start >= 0) {
                                unionTester.verify();
                            }
                            testPromiseComplete();
                        }
                    });
                },
                itemsFromRange: function (left, right) {
                    return {
                        firstIndex: 0,
                        lastIndex: 9
                    };
                }
            }
        });

        var unionTester = {
            start: -1,
            end: -1,
            expectedUnion: function (start, end) {
                this.start = start;
                this.end = end;
            },
            verify: function () {
                var affectedRange = listView._affectedRange.get();
                LiveUnit.Assert.areEqual(this.start, affectedRange.start);
                LiveUnit.Assert.areEqual(this.end, affectedRange.end);
                unionTester.complete()
            }
        };

        return waitForReady(listView)().then(function () {
            return new WinJS.Promise(function (complete) {
                unionTester.complete = complete;

                unionTester.interruptLayout = function () {
                    // Remove 3 items from index 10
                    for (var i = 0, len = 3; i < len; i++) {
                        list.splice(10, 0, { title: "New Item" + i });
                    }// [start = 10, end = 13)
                    unionTester.expectedUnion(8, 15); // This is the expected union of the move operation range [8, 12) and the three insert operatiosn range [10, 13)
                };

                list.move(8, 11); // [start = 8, end = 12)

            });
        }).then(function () {
            return waitForReady(listView)().then(function () {
                complete();
            });
        });
    };

    // Verifies that the ListView handles the following scenario without throwing an exception.
    // An empty non-grouped ListView receives a single batch of edits in which an item is
    // inserted and then removed.
    // Regression test for WinBlue#273002.
    this.testBatchOfEditsWhereListViewStaysEmpty = function (complete) {
        initUnhandledErrors();

        var element = document.getElementById("listEditorTest");
        var items = [];
        var listView = setupListView(element, "ListLayout", items, true);

        var tests = [
        function () {
            // Insert and remove an item in a single edit cycle.
            listView.itemDataSource.list.push({ title: "New Item" });
            listView.itemDataSource.list.pop();
            return true;
        },
        function () {
            validateUnhandledErrorsOnIdle().
                done(complete);
        }];
        runTests(listView, tests);
    };

    this.testMakingListEmptyAfterCtor = function (complete) {
        initUnhandledErrors();

        var list = new WinJS.Binding.List([{ title: "first" }]);

        var listView = new WinJS.UI.ListView(document.getElementById("listEditorTest"), {
            itemDataSource: list.dataSource,
            layout: new WinJS.UI.GridLayout()
        });

        list.pop();

        return waitForReady(listView)().
            then(validateUnhandledErrorsOnIdle).
            done(complete);
    };

    // Regression Test for Windows Blue Bug #409620   
    this.testReEntrancyEditsAfterLoadingStateComplete = function (complete) {
        initUnhandledErrors();

        var data = [];
        for (var i = 0; i < 400; i++) { // Crash requires that listview create containers asynchronously. 400 is big enough to force that.
            data.push({ title: "title" + i, index: i, itemWidth: "100px", itemHeight: "100px" });
        }
        var list = new WinJS.Binding.List(data);
        var groupedList = list.createGrouped(function groupKey(item) {
            var groupIndex = Math.floor(item.data ? (item.data.index / 1) : (item.index / 1));
            return groupIndex.toString();
        }, function groupData(item) {
            var groupIndex = Math.floor(item.data ? (item.data.index / 1) : (item.index / 1));
            var groupData = {
                title: "group" + groupIndex,
                index: groupIndex,
                itemWidth: "150px",
                itemHeight: "150px"
            };
            return groupData;
        });

        var testElement = document.createElement('div');
        var listView = new WinJS.UI.ListView(testElement, {
            layout: new WinJS.UI.ListLayout(),
            itemDataSource: groupedList.dataSource,
            groupDataSource: groupedList.groups.dataSource
        });
        document.body.appendChild(testElement);
        var ds = groupedList.dataSource;
        waitForReady(listView)().
            then(function () {
                return ds.getCount().then(function (count) {
                    var itemsToDelete = [];
                    itemsToDelete.push(ds.itemFromIndex(0));

                    return WinJS.Promise.join(itemsToDelete).then(function (items) {
                        ds.beginEdits();
                        var itemPromises = items.map(function (item) {
                            return ds.remove(item.key);
                        });
                        ds.endEdits();
                        return WinJS.Promise.join(itemPromises);
                    });
                });
            }).
            then(function () {
                return WinJS.Utilities.Scheduler.requestDrain(WinJS.Utilities.Scheduler.Priority.idle);
            }).then(function () {
                return WinJS.Promise.timeout(500);
            }).then(validateUnhandledErrorsOnIdle).               
            done(function () {
                WinJS.Utilities.disposeSubTree(testElement);
                document.body.removeChild(testElement);
                complete();
            });
    }
};


// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.ListEditorTest");
