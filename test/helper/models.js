const mongoose = require("mongoose");
const migrateOnWritePlugin = require("../../index");

function up(old) {
  let id = old._id || old.id;
  return {
    _id: id,
    username: old.u,
    name: old.n,
  };
}

function createModels(prefix = "") {
  const UserSchema = new mongoose.Schema({
    u: {
      type: String,
      index: true,
      unique: true,
      required: true,
    },
    n: { type: String, required: true },
  });

  const NewUserSchema = new mongoose.Schema({
    username: {
      type: String,
      index: true,
      unique: true,
      required: true,
    },
    name: { type: String, required: true },
  });

  const NewUser = mongoose.model(`${prefix}_users_v2`, NewUserSchema);

  UserSchema.plugin(migrateOnWritePlugin, {
    NewModel: NewUser,
    up,
  });
  const User = mongoose.model(`${prefix}_users`, UserSchema);
  return { User, NewUser };
}
module.exports = {
  createModels,
};
