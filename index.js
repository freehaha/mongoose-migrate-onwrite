const debug = require("debug")("migrate-onwrite");
const mongoose = require("mongoose");

async function saveOrUpdate(NewModel, newObj) {
  let newModelObj = new NewModel(newObj);
  try {
    await newModelObj.save();
  } catch (e) {
    debug("cannot save new document, trying to update...");
    try {
      await NewModel.updateOne({ _id: newObj._id }, newObj);
    } catch (e) {
      debug("error migrating document", e);
    }
  }
}

function isUnique(uniqueIndexes, param) {
  if (param._id) return true;
  for (const index of uniqueIndexes) {
    let found = true;
    for (const key of Object.keys(index[0])) {
      if (!param.hasOwnProperty(key)) {
        found = false;
        break;
      }
    }
    if (found) {
      return true;
    }
  }
  return false;
}

function removeUndef(obj) {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
  return obj;
}

const migrateOnWritePlugin = (schema, options) => {
  let { NewModel, up } = options;

  schema.post(["save"], async function (doc, next) {
    let newObj = up(doc);
    await saveOrUpdate(NewModel, newObj);
    next();
  });

  schema.post(["updateOne"], { query: true, document: false }, async function (
    _,
    next
  ) {
    debug("updateOne", this.getQuery());
    let user = await this.model.findOne(this.getQuery());
    await saveOrUpdate(NewModel, up(user));
    next();
  });

  schema.post(["remove"], { query: true, document: false }, async function () {
    let upQuery = up(this.getQuery());
    upQuery = removeUndef(upQuery);
    await NewModel.deleteMany(upQuery);
  });

  schema.post(
    ["findOneAndDelete"],
    { query: true, document: false },
    async function (doc) {
      await NewModel.deleteOne({ _id: doc.id });
    }
  );

  schema.post(
    ["findOneAndRemove"],
    { query: true, document: false },
    async function (doc) {
      await NewModel.deleteOne({ _id: doc.id });
    }
  );

  schema.post(
    ["findOneAndUpdate"],
    { query: true, document: false },
    async function (doc) {
      debug("findOneAndUpdate");
      let d = await this.model.findOne({ _id: doc.id });
      let newObj = up(d);
      await saveOrUpdate(NewModel, newObj);
    }
  );

  schema.post(["remove"], { query: false, document: true }, async function () {
    await NewModel.deleteOne({ _id: this.id });
  });

  schema.post(["deleteOne"], { query: false, document: true }, async function (
    _,
    next
  ) {
    debug("deleting", this._id);
    await NewModel.deleteOne({ _id: this._id });
    next();
  });

  schema.pre(["updateOne"], async function () {
    if (this.getQuery()._id) {
      return;
    }
    let indexes = this.model.schema.indexes().filter((i) => i[1].unique);
    if (!isUnique(indexes, this.getQuery())) {
      throw Error("no unique params in updateOne");
    }
  });

  schema.pre(
    ["deleteOne"],
    { query: true, document: false },
    async function () {
      let indexes = this.model.schema.indexes().filter((i) => i[1].unique);
      if (!isUnique(indexes, this.getQuery())) {
        throw Error("no unique params in deleteOne");
      }
    }
  );

  schema.post(
    ["deleteOne"],
    { query: true, document: false },
    async function () {
      let upQuery = up(this.getQuery());
      upQuery = removeUndef(upQuery);
      debug(upQuery);
      debug("deleting", this.getQuery(), upQuery);
      await NewModel.deleteOne(upQuery);
    }
  );

  schema.post(["deleteMany"], async function (_, next) {
    let upQuery = up(this.getQuery());
    upQuery = removeUndef(upQuery);
    debug("deleting", this.getQuery(), upQuery);
    await NewModel.deleteMany(upQuery);
    next();
  });
};

module.exports = migrateOnWritePlugin;
