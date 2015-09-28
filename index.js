/**
 * Created by bes on 9/28/15.
 */
var rally = require('rally');
var q = require('q');

function Jasmine2RallyReporter(options) {
    var self = this;

    options = options || {};
    options.app = options.app || {};
    options.rally = options.rally || {};

    var appBuild = options.app.build || '';
    var rallyTester = options.rally.tester || '';
    var rallyUser = options.rally.user || undefined;
    var rallyPass = options.rally.pass || undefined;
    var rallyApiKey = options.rally.apiKey || undefined;

    var rallyAPIClient = rally(
        {
            user: rallyUser, //required if no api key, defaults to process.env.RALLY_USERNAME
            pass: rallyPass, //required if no api key, defaults to process.env.RALLY_PASSWORD
            apiKey: rallyApiKey, //preferred, required if no user/pass, defaults to process.env.RALLY_API_KEY
            apiVersion: 'v2.0', //this is the default and may be omitted
            server: 'https://rally1.rallydev.com',  //this is the default and may be omitted
            //requestOptions: {
            //    headers: {
            //        'X-RallyIntegrationName': 'My cool node.js program',  //while optional, it is good practice to
            //        'X-RallyIntegrationVendor': 'My company',             //provide this header information
            //        'X-RallyIntegrationVersion': '1.0'
            //    }
            //    any additional request options (proxy options, timeouts, etc.)
            //}
        }
    );

    function getTestsCase(testCaseFormatedId) {
        return rallyAPIClient.query({
            type: 'testcase',
            start: 1,
            pageSize: 2,
            limit: 10,
            order: 'Rank',
            query: rally.util.query.where('FormattedID', '=', testCaseFormatedId)
        }).then(function (res) {
            return q.when(res.Results[0])
        }).catch(function (reason) {
            return q.reject(reason)
        });
    }

    function getUser(username) {
        return rallyAPIClient.query({
            type: 'user',
            start: 1,
            pageSize: 2,
            limit: 10,
            query: rally.util.query.where('UserName', '=', username)
        }).then(function (res) {
            return q.when(res.Results[0])
        }).catch(function (reason) {
            return q.reject(reason);
        });
    }

    self.specDone = function (spec) {
        var testCaseId = spec.description.split('#')[1] || null;

        if (testCaseId) {
            q.all([
                getTestsCase(testCaseId),
                getUser(rallyTester),
                browser.getCapabilities()
            ]).then(function (res) {
                var testcase = res[0];
                var user = res[1];
                var cap = res[2];
                var environment = cap.caps_.browserName +
                    ' v' + cap.caps_.version +
                    ' (' + cap.caps_.platform + ')';
                var notes = [];
                for (var i = 0; i < spec.failedExpectations.length; i++) {
                    notes.push(spec.failedExpectations[i].messages)
                }
                notes = notes.join('; <br>');

                return rallyAPIClient.create({
                    type: 'testcaseresult',
                    data: {
                        TestCase: testcase,
                        Verdict: (spec.status == "passed") ? 'Pass' : "Fail",
                        Date: new Date().toISOString(),
                        Environment: environment,
                        Notes: notes,
                        Build: appBuild,
                        Tester: user,
                    }
                }).then(function (res) {
                    var a = res; //TODO: HANDLE A RESULT?!!
                });
            }).catch(function (err) {
                var a = err; //TODO: HANDLE THE ERROR!!
            });
        }
    };
}

module.exports = Jasmine2RallyReporter;