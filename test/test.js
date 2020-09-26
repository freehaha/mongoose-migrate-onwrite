const chai = require("chai");
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require("chai").expect;
const { createModels } = require("./helper/models");

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/test", {
  useNewUrlParser: true,
  useFindAndModify: true,
  useUnifiedTopology: true,
});
mongoose.connection.dropDatabase("test");
//mongoose.set("debug", { color: true });
mongoose.set("useCreateIndex", true);

async function wait(timeout) {
  return new Promise((resolve) =>
    setTimeout(function () {
      resolve();
    }, timeout)
  );
}

describe("CRUD", function () {
  before(async function () {
    Object.keys(mongoose.connection.models).forEach((modelName) => {
      delete mongoose.connection.models[modelName];
    });
    await mongoose.connection.dropDatabase();
  });

  it("should create new entity on both sets", async function () {
    let { User, NewUser } = createModels("saving_entities");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    u = await User.findOne({ u: "haha", n: "John Sun" });
    expect(u).not.to.be.null;
    expect(u).to.have.property("u", "haha");
    let dup = await NewUser.findOne({ username: "haha", name: "John Sun" });
    expect(dup._id.toString()).to.equal(u._id.toString());
    expect(dup).not.to.be.null;
    expect(dup).to.have.property("username", "haha");
  });

  it("should create new entities(Model.create) on both sets", async function () {
    let { User, NewUser } = createModels("createEntities");
    await User.create([
      { u: "u1", n: "n" },
      { u: "u2", n: "n" },
      { u: "u3", n: "n" },
    ]);
    let u = await User.find({ n: "n" });
    expect(u).not.to.be.null;
    expect(u).to.have.lengthOf(3);

    let dups = await NewUser.find({ name: "n" });
    expect(dups).not.to.be.null;
    expect(dups).to.have.lengthOf(3);
  });

  it("should update one entity on both sets", async function () {
    let { User, NewUser } = createModels("updating_entities");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    await User.updateOne(
      { u: "haha" },
      {
        n: "Yu-Jen Sun",
      }
    );
    // u = await User.findOne({ u: "haha" });
    // expect(u).not.to.be.null;
    // expect(u).to.have.property("n", "Yu-Jen Sun");
    let dup = await NewUser.findOne({ username: "haha" });
    expect(dup).not.to.be.null;
    expect(dup._id.toString()).to.equal(u._id.toString());
    expect(dup).to.have.property("name", "Yu-Jen Sun");

    await expect(User.updateOne({ n: "Yu-Jen Sun" }, { n: "hoho" })).to.be
      .rejected;
  });

  it("should update one(doc.updateOne) entity on both sets", async function () {
    let { User, NewUser } = createModels("docUpdateOne");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    u = await User.findOne({ u: "haha" });
    await u.updateOne({ n: "Yu-Jen Sun" });
    let dup = await NewUser.findOne({ username: "haha" });
    expect(dup).not.to.be.null;
    expect(dup._id.toString()).to.equal(u._id.toString());
    expect(dup).to.have.property("name", "Yu-Jen Sun");
  });

  it("should update one(doc.updateOne) entity on both sets even if it didn't exist in the new collection ", async function () {
    let { User, NewUser } = createModels("docUpdateOneNew");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    await NewUser.deleteMany({});
    u = await NewUser.findOne({ username: "haha" });
    expect(u).to.be.null;
    u = await User.findOne({ u: "haha" });
    await u.updateOne({ n: "Yu-Jen Sun" });
    let dup = await NewUser.findOne({ username: "haha" });
    expect(dup).not.to.be.null;
    expect(dup._id.toString()).to.equal(u._id.toString());
    expect(dup).to.have.property("name", "Yu-Jen Sun");
  });

  it("should remove(doc.remove) entity from both sets", async function () {
    let { User, NewUser } = createModels("docRemove");
    await User.create([
      { u: "u1", n: "n1" },
      { u: "u2", n: "n2" },
    ]);
    let u = await User.findOne({ u: "u1" });
    delete u.remove();
    await wait(10);
    let dup = await NewUser.findOne({ username: "u1" });
    expect(dup).to.be.null;
  });

  it("should remove(deleteOne) entity from both sets", async function () {
    let { User, NewUser } = createModels("deleteOne");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    await User.deleteOne({ u: "haha" });
    u = await User.findOne({ u: "haha" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "haha" });
    expect(dup).to.be.null;

    await User.create([
      { u: "u1", n: "n" },
      { u: "u2", n: "n" },
    ]);
    // should be rejected if not using uniqu index
    await expect(User.deleteOne({ n: "n" })).to.be.rejected;
    await expect(User.deleteOne({ u: "u1" })).not.to.be.rejected;
    u = await User.findOne({ n: "n" });
    expect(u).not.to.be.null;
    expect(u.u).to.equal("u2");
    dup = await NewUser.findOne({ name: "n" });
    expect(dup).not.to.be.null;
    expect(dup.id).to.equal(u.id);
  });

  it("should remove(doc.deleteOne) entity from both sets", async function () {
    let { User, NewUser } = createModels("docDeleteOne");
    let u = new User({
      u: "haha",
      n: "John Sun",
    });
    await u.save();
    u = await User.findOne({ u: "haha" });
    await u.deleteOne();
    u = await User.findOne({ u: "haha" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "haha" });
    expect(dup).to.be.null;
  });

  it("should remove(deleteMany) entities from both sets", async function () {
    let { User, NewUser } = createModels("deleteMany");
    await User.create([
      { u: "user1", n: "John1" },
      { u: "user2", n: "John2" },
    ]);
    await User.deleteMany({ u: "user1" });

    let u = await User.findOne({ u: "user1" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).to.be.null;

    await User.create([
      { u: "user3", n: "someName" },
      { u: "user4", n: "someName" },
    ]);
    await User.deleteMany({ n: "someName" });
    u = await User.find({ n: "someName" });
    expect(u).to.have.lengthOf(0);
    dup = await NewUser.find({ name: "someName" });
    expect(dup).to.have.lengthOf(0);
  });

  it("should remove(deleteMany) entities from both even if some are not present", async function () {
    let { User, NewUser } = createModels("deleteMany_partial");
    await User.create([
      { u: "user1", n: "John1" },
      { u: "user2", n: "John2" },
    ]);
    await User.deleteMany({ u: "user1" });

    let u = await User.findOne({ u: "user1" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).to.be.null;

    await User.create([
      { u: "user3", n: "someName" },
      { u: "user4", n: "someName" },
    ]);
    await NewUser.deleteOne({ n: "someName" });
    await User.deleteMany({ n: "someName" });
    u = await User.find({ n: "someName" });
    expect(u).to.have.lengthOf(0);
    dup = await NewUser.find({ name: "someName" });
    expect(dup).to.have.lengthOf(0);
  });

  it("should remove(remove) entities from both sets", async function () {
    let { User, NewUser } = createModels("remove");
    await User.create([
      { u: "user1", n: "John1" },
      { u: "user2", n: "John2" },
    ]);
    await User.remove({ u: "user1" });

    let u = await User.findOne({ u: "user1" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).to.be.null;
    dup = await NewUser.findOne({ username: "user2" });
    expect(dup).not.to.be.null;
  });

  it("should remove(findOneAndDelete) entities from both sets", async function () {
    let { User, NewUser } = createModels("OneAndDelete");
    await User.create([
      { u: "user1", n: "John1" },
      { u: "user2", n: "John2" },
    ]);
    await User.findOneAndDelete({ u: "user1" });
    let u = await User.findOne({ u: "user1" });
    expect(u).to.be.null;
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).to.be.null;

    await User.create([
      { u: "user3", n: "n" },
      { u: "user4", n: "n" },
    ]);
    await User.findOneAndDelete({ n: "n" });
    u = await User.findOne({ n: "n" });
    dup = await NewUser.findOne({ name: "n" });
    expect(dup).not.to.be.null;
    expect(dup.id).to.equal(u.id);
  });

  it("should update(findOneAndUpdate) entities in both sets", async function () {
    let { User, NewUser } = createModels("OneAndUpdate");
    await User.create([
      { u: "user1", n: "John1" },
      { u: "user2", n: "John0" },
    ]);
    await User.findOneAndUpdate({ u: "user1" }, { n: "John0" });
    let u = await User.findOne({ u: "user1" });
    expect(u.n).to.equal("John0");
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).not.to.be.null;
    expect(dup.name).to.equal("John0");

    u = await User.findOneAndUpdate({ n: "John0" }, { n: "John1" });
    expect(u.n).to.equal("John0");
    dup = await NewUser.findOne({ name: "John1" });
    expect(dup.id).to.equal(u.id);
  });

  it("should remove(findOneAndRemove) entities in both sets", async function () {
    let { User, NewUser } = createModels("OneAndRemove");
    await User.create([
      { u: "user1", n: "n" },
      { u: "user2", n: "n" },
    ]);
    await User.findOneAndRemove({ n: "n" });
    let u = await User.findOne({ u: "user1" });
    expect(u).to.be.null;
    await wait(30);
    let dup = await NewUser.findOne({ username: "user1" });
    expect(dup).to.be.null;
    dup = await NewUser.findOne({ username: "user2" });
    expect(dup).not.to.be.null;
  });
});
