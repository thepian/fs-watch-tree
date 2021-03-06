var buster = require("buster");
var fs = require("fs");

var fsWatcher = require("../lib/fs-watcher");

buster.testCase('fs-watcher', {
    setUp: function () {
        this.closer = { close: this.spy(), on: this.spy() };
        this.stub(fs, "watch").returns(this.closer);
        this.watcher = fsWatcher.create();
    },

    "watches files": function () {
        this.watcher.watch({ name: "file.txt" }, this.spy());
        assert.calledOnceWith(fs.watch, "file.txt");
    },

    "calls back when file changes": function () {
        var spy = this.spy();
        var file = { name: "file.txt" };
        this.watcher.watch(file, spy);

        fs.watch.yield("change");

        assert.calledOnceWith(spy, "change", file);
    },

    "unwatches files": function () {
        this.watcher.watch({ name: "file.txt" }, this.spy());
        this.watcher.unwatch({ name: "file.txt" });

        assert.calledOnce(this.closer.close);
    },

    "unwatches directories": function () {
        this.watcher.fileSeparator = "/";

        this.watcher.watch({ name: "files" }, this.spy());
        this.watcher.watch({ name: "files/file1.txt" }, this.spy());
        this.watcher.watch({ name: "files/file2.txt" }, this.spy());
        this.watcher.watch({ name: "filesystem.txt" }, this.spy());
        this.watcher.watch({ name: "notes/file1.txt" }, this.spy());

        this.watcher.unwatchDir({ name: "files" });

        assert.calledThrice(this.closer.close);
    },

    "closes watches": function () {
        this.watcher.watch({ name: "file1.txt" }, this.spy());
        this.watcher.watch({ name: "file2.txt" }, this.spy());
        this.watcher.end();

        assert.calledTwice(this.closer.close);
    },

    "register error handler for closer": function () {

        this.watcher.watch({ name: "files" }, this.spy());

        assert.calledWith(this.closer.on, "error");
    },

    "ignore error if directory doesn't exist": function () {

        this.stub(fs, "exists", function (fileName, callback) {
            callback(false);
        });
        this.stub(console, "log");
        var error = new Error("permission");

        this.closer.on = function (event, callback) {
            if (event === "error") {
                refute.exception(callback.bind(null, error));
                assert.calledWith(console.log, "Watching error occurred for " +
                                  "non existing file: notExist (Error: " +
                                  "permission)");
            }
        };

        this.watcher.watch({ name: "notExist" }, this.spy());
    },

    "forward error if directory exist": function () {

        this.stub(fs, "exists", function (fileName, callback) {
            callback(true);
        });
        var error = new Error("error");

        this.closer.on = function (event, callback) {
            if (event === "error") {
                assert.exception(callback.bind(null, error), "Error", "error");
            }
        };

        this.watcher.watch({ name: "files" }, this.spy());
    }

});
