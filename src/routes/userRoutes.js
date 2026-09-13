const express = require("express");
const router = express.Router();
const { getAllUsers, updateUserRole, deleteUser } = require("../controllers/userController");

router.get("/", getAllUsers);
router.patch("/", updateUserRole);
router.put("/:id", updateUserRole);
router.delete("/:id", deleteUser);
router.delete("/", deleteUser);

module.exports = router;
