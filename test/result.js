const assert = require("better-assert");
const { deepStrictEqual, strictEqual, throws } = require("node:assert");

const { Ok, Fail } = require("../result.js");

// Unit tests for the inlined Result type. IrcSocket#connect() resolves to one
// of these, so this suite guards the public contract (previously provided by
// the r-result package) against regressions in future refactors.
describe("Result", function () {
    describe("construction and inspection", function () {
        it("Ok reports isOk/isFail", function () {
            const r = Ok(5);
            assert(r.isOk() === true);
            assert(r.isFail() === false);
        });

        it("Fail reports isOk/isFail", function () {
            const r = Fail("boom");
            assert(r.isOk() === false);
            assert(r.isFail() === true);
        });
    });

    describe("ok / fail unwrapping", function () {
        it("ok() returns the value of an Ok", function () {
            assert(Ok(42).ok() === 42);
        });

        it("fail() returns the value of a Fail", function () {
            assert(Fail("reason").fail() === "reason");
        });

        it("ok() on a Fail throws a TypeError", function () {
            throws(() => Fail("x").ok(), TypeError);
        });

        it("fail() on an Ok throws a TypeError", function () {
            throws(() => Ok(1).fail(), TypeError);
        });

        it("ok()/fail() honour a custom error message", function () {
            throws(() => Fail("x").ok("custom-ok-msg"), /custom-ok-msg/);
            throws(() => Ok(1).fail("custom-fail-msg"), /custom-fail-msg/);
        });
    });

    describe("map / mapFail", function () {
        it("map transforms an Ok value", function () {
            assert(Ok(2).map((x) => x + 1).ok() === 3);
        });

        it("map leaves a Fail untouched", function () {
            assert(Fail("e").map((x) => x + 1).fail() === "e");
        });

        it("mapFail transforms a Fail value", function () {
            assert(Fail("e").mapFail((x) => x + "!").fail() === "e!");
        });

        it("mapFail leaves an Ok untouched", function () {
            assert(Ok(2).mapFail((x) => x + "!").ok() === 2);
        });
    });

    describe("and / or", function () {
        it("and returns the rhs when Ok", function () {
            assert(Ok(1).and(Ok(9)).ok() === 9);
        });

        it("and short-circuits on Fail", function () {
            assert(Fail("e").and(Ok(9)).fail() === "e");
        });

        it("or keeps the lhs when Ok", function () {
            assert(Ok(1).or(Ok(9)).ok() === 1);
        });

        it("or returns the rhs when Fail", function () {
            assert(Fail("e").or(Ok(9)).ok() === 9);
        });
    });

    describe("andThen / orElse", function () {
        it("andThen chains on Ok", function () {
            assert(Ok(2).andThen((x) => Ok(x * 2)).ok() === 4);
        });

        it("andThen short-circuits on Fail", function () {
            assert(Fail("e").andThen((x) => Ok(x * 2)).fail() === "e");
        });

        it("orElse recovers on Fail", function () {
            assert(Fail("e").orElse(() => Ok(0)).ok() === 0);
        });

        it("orElse keeps the value on Ok", function () {
            assert(Ok(2).orElse(() => Ok(0)).ok() === 2);
        });
    });

    describe("toArray", function () {
        it("wraps an Ok value in a single-element array", function () {
            deepStrictEqual(Ok(5).toArray(), [5]);
        });

        it("yields an empty array for a Fail", function () {
            deepStrictEqual(Fail("e").toArray(), []);
        });
    });

    describe("unwrapOr / unwrapOrElse", function () {
        it("unwrapOr returns the value for an Ok", function () {
            assert(Ok(5).unwrapOr(99) === 5);
        });

        it("unwrapOr returns the default for a Fail", function () {
            assert(Fail("e").unwrapOr(99) === 99);
        });

        it("unwrapOrElse computes the default from the failure", function () {
            assert(Fail("err").unwrapOrElse((f) => f.length) === 3);
        });

        it("unwrapOrElse returns the value for an Ok", function () {
            assert(Ok(5).unwrapOrElse(() => 99) === 5);
        });
    });

    describe("match", function () {
        it("dispatches to Ok branch", function () {
            const out = Ok(5).match({ Ok: (v) => "o" + v, Fail: (v) => "f" + v });
            assert(out === "o5");
        });

        it("dispatches to Fail branch", function () {
            const out = Fail("e").match({ Ok: (v) => "o" + v, Fail: (v) => "f" + v });
            assert(out === "fe");
        });
    });

    describe("inspect", function () {
        const stylize = (x) => x;

        it("renders Ok(...)", function () {
            assert(Ok(5).inspect(2, { stylize, depth: 2 }).indexOf("Ok(") === 0);
        });

        it("renders Fail(...)", function () {
            assert(Fail("e").inspect(2, { stylize, depth: 2 }).indexOf("Fail(") === 0);
        });

        it("short-circuits to a tag when depth < 0", function () {
            strictEqual(Ok(5).inspect(-1, { stylize, depth: 2 }), "[Ok]");
            strictEqual(Fail("e").inspect(-1, { stylize, depth: 2 }), "[Fail]");
        });
    });

    describe("debug / debugOk / debugFail", function () {
        it("debug logs and returns the result unchanged", function () {
            const logged = [];
            const r = Ok(5);
            assert(r.debug((m) => logged.push(m)) === r);
            assert(logged.length === 1);
        });

        it("debugOk only logs for an Ok", function () {
            const logged = [];
            Ok(5).debugOk((m) => logged.push(m));
            Fail("e").debugOk((m) => logged.push(m));
            assert(logged.length === 1);
        });

        it("debugFail only logs for a Fail", function () {
            const logged = [];
            Ok(5).debugFail((m) => logged.push(m));
            Fail("e").debugFail((m) => logged.push(m));
            assert(logged.length === 1);
        });
    });

    describe("method set parity", function () {
        it("exposes exactly the r-result instance methods", function () {
            const expected = [
                "and", "andThen", "debug", "debugFail", "debugOk", "fail",
                "inspect", "isFail", "isOk", "map", "mapFail", "match", "ok",
                "or", "orElse", "toArray", "unwrapOr", "unwrapOrElse"
            ].sort();
            const actual = Object.keys(Object.getPrototypeOf(Ok(1))).sort();
            deepStrictEqual(actual, expected);
        });
    });
});
