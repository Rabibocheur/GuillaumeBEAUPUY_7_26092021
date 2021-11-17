const models = require("../models");
const fs = require("fs");

exports.getAllPosts = async (req, res) => {
  const limit = 4
  const page = parseInt(req.query.page) || 1

  const options = {
    include: 'user',
    limit,
    offset: limit * (page - 1),
    order: [['createdAt', 'DESC']]
  }

  if (req.query.userUuid) {
    const user = await models.User.findOne({
      where: { uuid: req.query.userUuid },
    });
    options.where = {
      userId: user.id
    }
    console.log(options)
  }

  models.Post.findAll(options)
    .then(posts => res.status(200).json(posts))
    .catch(error => res.status(400).json({ error }))
};

exports.createPost = async (req, res) => {

  console.log(req.files)
  let content = "";
  if (req.files) {
    const url = req.protocol + "://" + req.get("host");
    for (let i = 0; i < req.files.length; i++) {
      content += url + "/images/" + req.files[i].filename + ";";
    }
  }

  const postObject = req.files
    ? {
        title: req.body.title,
        content: content,
      }
    : { ...req.body };

    console.log(postObject.content)


  try {
    const user = await models.User.findOne({
      where: { uuid: req.token.userUuid },
    });

    const newPost = await models.Post.create({
      title: postObject.title == 'null' ? "" : postObject.title,
      content: req.files ? postObject.content : "",
      userId: user.id,
    });

    const post = await models.Post.findOne({
      where: { id: newPost.id },
      include: "user",
    });

    return res.status(201).json(post);

  } catch (error) {
    return res.status(500).json({ error });
  }
};

exports.modifyPost = async (req, res) => {
  let newContent = "";
  if (req.files) {
    let newFiles = [];
    const url = req.protocol + "://" + req.get("host");
    for (let i = 0; i < req.files.length; i++) {
      newFiles.push(url + "/images/" + req.files[i].filename);
    }

    req.body.urls = req.body.urls.split(";");

    let j = 0;
    for (const i of Object.keys(req.body.urls)) {
      if (req.body.urls[i].includes("blob:")) {
        req.body.urls[i] = newFiles[j];
        j++;
      }
    }

    req.body.urls.pop();

    for (const i of Object.keys(req.body.urls)) {
      newContent += req.body.urls[i] + ";";
    }

    // const file = await post.content.split("/images/")[1];
    // if (file != undefined) {
    //   fs.unlink(`images/${file}`, (error) => {
    //     if (error) res.status(400).json({ error });
    //   });
    // }

  }

  const postObject = req.files
    ? {
        title: req.body.title,
        content: newContent,
      }
    : { ...req.body };

  const uuid = req.token.userUuid;

  try {
    const user = await models.User.findOne({ where: { uuid } });
    const post = await models.Post.findOne({
      where: { id: req.params.postId, userId: user.id },
    });

    post.title = postObject.title;
    post.content = postObject.content;

    await post.save();

    const changedPost = await models.Post.findOne({
      where: { id: req.params.postId, userId: user.id },
      include: "user",
    });

    return res.status(201).json(changedPost);

  } catch (error) {
    return res.status(500).json({ error });
  }
};

exports.deletePost = async (req, res) => {
  const uuid = req.token.userUuid;
  const isAdmin = req.token.isAdmin;
  const where = {
    id: req.params.postId,
  };

  try {
    const user = await models.User.findOne({ where: { uuid } });
    if (!isAdmin) where.userId = user.id;
    const post = await models.Post.findOne({ where });
    // const isfiles = await post.content
    // if (isfiles != "") {
    //   const files = await post.content.split(";");
    //   for (let i = 0; i < files.length - 1; i++) {
    //     const file = await files[i].split("/images/")[1];
    //     console.log(files)
    //     fs.unlink(`images/${file}`, (error) => {
    //       if (error) res.status(400).json({ error });
    //     });
    //   }
    // }
    await post.destroy();
    await models.Comment.destroy({ where: { postId: req.params.postId } });
    await models.Like.destroy({ where: { postId: req.params.postId } });
    return res.status(200).json({ message: "Publication supprimé" });
  } catch (e) {
    return res.status(500).json({ e });
  }
};