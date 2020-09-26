# mongoose-migrate-onwrite
plugin to migrate data slowly when writing data

# Usage
```
const mongoose = require("mongoose");
const migrateOnWritePlugin = require("mongoose-migrate-onwrite");

function up(old) {
  let id = old._id || old.id;
  return {
    _id: id,
    username: old.u,
    name: old.n,
  };
}

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

const NewUser = mongoose.model(`users_v2`, NewUserSchema);

UserSchema.plugin(migrateOnWritePlugin, {
  NewModel: NewUser,
  up,
});
const User = mongoose.model(`users`, UserSchema);

function async writeData() {
  await User.create([
	{ u: "u1", n: "n" },
	{ u: "u2", n: "n" },
	{ u: "u3", n: "n" },
  ]);
  // user_v2 should have corresponding data:
  // { username: "u1", name: "n" }
  // { username: "u2", name: "n" }
  // { username: "u3", name: "n" }
}

writeData();
```

# Note
when this plugin is in use, Model.updateOne, Model.deleteOne will throw an error if the provided
query doesn't contain an unique key (single or compound). This retriction is in place to make sure
records in the new collection does not get updated/deleted accidentally.

