/* global describe, it, beforeEach, afterEach */

import Minihull from "minihull";
import jwt from "jwt-simple";
import axios from "axios";
import assert from "assert";

const bootstrap = require("./support/bootstrap");

describe("Connector for /webhook endpoint", function webhookTests() {
  this.timeout(3000);
  let server;
  let minihull;
  beforeEach(done => {
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

  const config = {
    organization: "localhost:8001",
    ship: "123456789012345678901234",
    secret: "1234"
  };
  const token = jwt.encode(config, "1234");

  it("should update user traits about bounced and blocked email", done => {
    axios.post(`http://localhost:8000/webhook?token=${token}`, [{
      ip: "167.89.106.6",
      status: "5.7.1",
      sg_message_id: "RmdHacGOStahdaZx4IY9Gg.filter0026p3mdw1-18278-598474A7-2.3",
      marketing_campaign_name: "test",
      email: "test@email.com",
      timestamp: 1501852843,
      marketing_campaign_id: 1473818,
      category: ["campaign"],
      sg_user_id: 5898096,
      sg_event_id: "k0FmOAa0Sp2igYFMkJ1i4A",
      reason: "554 5.7.1 Service unavailable; Client host [167.89.106.6] blocked using dnsbl.sorbs.net; Currently Sending Spam See: http://www.sorbs.net/lookup.shtml?167.89.106.6",
      event: "bounce",
      tls: 1,
      asm_group_id: 3051,
      type: "blocked"
    }]
    );

    minihull.on("incoming.request", req => {
      const batch = req.body.batch[0];
      const eventData = batch.body;
      if (batch.type === "track") {
        assert.equal(eventData.ip, "167.89.106.6");
        assert.equal(eventData.source, "sendgrid");
        assert.equal(eventData.created_at, "1501852843");
        assert.equal(eventData.event_type, "email");
        assert.equal(eventData.properties.campaign_name[0], "campaign");
        assert.equal(eventData.event, "Email Bounced");
      } else if (batch.type === "traits") {
        assert(eventData["sendgrid/email_bouncing"]);
        assert(eventData["sendgrid/is_blocked"]);
      }
    });

    setTimeout(() => {
      done();
    }, 2500);
  });

  it("should update user traits about bounced email", done => {
    axios.post(`http://localhost:8000/webhook?token=${token}`, [{
      ip: "167.89.106.6",
      status: "5.7.1",
      sg_message_id: "RmdHacGOStahdaZx4IY9Gg.filter0026p3mdw1-18278-598474A7-2.3",
      marketing_campaign_name: "test",
      email: "test@email.com",
      timestamp: 1501852843,
      marketing_campaign_id: 1473818,
      category: ["campaign"],
      sg_user_id: 5898096,
      sg_event_id: "k0FmOAa0Sp2igYFMkJ1i4A",
      reason: "554 5.7.1 Service unavailable; Client host [167.89.106.6] blocked using dnsbl.sorbs.net; Currently Sending Spam See: http://www.sorbs.net/lookup.shtml?167.89.106.6",
      event: "bounce",
      tls: 1,
      asm_group_id: 3051,
      type: "bounce"
    }]
    );

    minihull.on("incoming.request", req => {
      const batch = req.body.batch[0];
      const eventData = batch.body;
      if (batch.type === "track") {
        assert.equal(eventData.ip, "167.89.106.6");
        assert.equal(eventData.source, "sendgrid");
        assert.equal(eventData.created_at, "1501852843");
        assert.equal(eventData.event_type, "email");
        assert.equal(eventData.properties.campaign_name[0], "campaign");
        assert.equal(eventData.event, "Email Bounced");
      } else if (batch.type === "traits") {
        assert(eventData["sendgrid/email_bouncing"]);
      }
    });

    setTimeout(() => {
      done();
    }, 2500);
  });

  it("should not send any traits if there is no any bounced event", done => {
    axios.post(`http://localhost:8000/webhook?token=${token}`, [{
      response: "250 OK",
      sg_event_id: "sendgrid_internal_event_id",
      sg_message_id: "sendgrid_internal_message_id",
      event: "delivered",
      email: "email@example.com",
      timestamp: 1249948800,
      unique_arg_key: "unique_arg_value",
      category: ["category1", "category2"],
      newsletter: {
        newsletter_user_list_id: "10557865",
        newsletter_id: "1943530",
        newsletter_send_id: "2308608"
      },
      asm_group_id: 1,
      ip: "127.0.0.1",
      tls: "1",
      cert_err: "1"
    }]
    );

    minihull.on("incoming.request", req => {
      const batch = req.body.batch[0];
      const eventData = batch.body;
      if (batch.type === "track") {
        assert.equal(eventData.ip, "127.0.0.1");
        assert.equal(eventData.source, "sendgrid");
        assert.equal(eventData.created_at, "1249948800");
        assert.equal(eventData.event_type, "email");
        assert.equal(eventData.properties.campaign_name[0], "category1");
        assert.equal(eventData.properties.campaign_name[1], "category2");
        assert.equal(eventData.event, "Email Delivered");
      } else if (batch.type === "traits") {
        done(Error("Received traits request that should not happen because it is not bounce event"));
      }
    });

    setTimeout(() => {
      done();
    }, 2500);
  });

  it("should respond with error if payload was not an array", done => {
    axios.post(`http://localhost:8000/webhook?token=${token}`, {}).then(res => {
      assert.equal(res.data, "error");
      done();
    });
  });

  it("should deal with inboud parse webhook", done => {
    axios.post(`http://localhost:8000/webhook?token=${token}`, {
      from: "sender",
      envelop: {
        from: "sender"
      }
    });

    minihull.on("incoming.request", req => {
      const eventData = req.body.batch[0].body;

      assert.equal(eventData.source, "sendgrid");
      assert.equal(eventData.event_type, "email");
      assert.equal(eventData.event, "Inbound Email");

      done();
    });
  });
});
