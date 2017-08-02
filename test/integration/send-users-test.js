const Minihull = require("minihull");
const expect = require("chai").expect;
const moment = require("moment");
const nock = require("nock");

const bootstrap = require("./support/bootstrap");

describe("Clearbit API errors", function test() {
  this.timeout(10000);
  let server, minihull;
  beforeEach((done) => {
    minihull = new Minihull();
    server = bootstrap(8000);
    minihull.listen(8001).then(done);
    minihull.stubConnector({
      id: "123456789012345678901234",
      private_settings: {
        api_key: "123",
        segments_mapping: {
          1: 1708197
        }
      }
    });
    minihull.stubSegments([{
      id: "1",
      name: "A"
    }]);
  });

  afterEach(() => {
    minihull.close();
    server.close();
  });

  it("handle user errors", (done) => {
    minihull.stubBatch([{
      id: "123",
      email: "a0@foo.bar",
      segment_ids: ["1"]
    }, {
      id: "124",
      email: "invalid_email1"
    }, {
      id: "125",
      email: "b2@foo.bar"
    }, {
      id: "126",
      email: "invalid_email3"
    }, {
      id: "127",
      email: "invalid_email4"
    }, {
      id: "128",
      email: "c5@foo.bar"
    }, {
      id: "129",
      email: "d6@foo.bar",
      "traits_sendgrid/id": "ZDZAZm9vLmJhcg=="
    }]);

    nock("https://api.sendgrid.com")
      .get("/v3/contactdb/lists")
      .reply(200, {
        lists: [{
          id: 1708197,
          name: '[Hull] Segment List',
          recipient_count: 0
        }]
      });

    nock("https://api.sendgrid.com")
      .post("/v3/contactdb/recipients")
      .reply(200, {
        error_count: 3,
        error_indices: [3, 4, 5],
        errors: [{
          error_indices: [3, 4, 5],
          message: "The email address you added is invalid. Please check it and try again."
        }],
        new_count: 0,
        persisted_recipients: ["YTBAZm9vLmJhcg==", "YjJAZm9vLmJhcg==", "YzVAZm9vLmJhcg=="],
        unmodified_indices: [],
        updated_count: 3
      });

    nock("https://api.sendgrid.com")
      .post("/v3/contactdb/lists/1708197/recipients")
      .reply(200);

    minihull.on("incoming.request@/api/v1/firehose", (req) => {
      expect(req.body.batch.length).to.equal(3);
      expect(req.body.batch[0].body["sendgrid/invalid_reason"]).to.equal("The email address you added is invalid. Please check it and try again.");
      done();
    });

    minihull.batchConnector("123456789012345678901234", "http://localhost:8000/batch")
    .then(() => {}).catch(err => console.error(err));
  });
});
