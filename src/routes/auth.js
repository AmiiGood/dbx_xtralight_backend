const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   GET /api/auth/perfil
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get("/perfil", verificarToken, authController.obtenerPerfil);

/**
 * @route   POST /api/auth/cambiar-password
 * @desc    Cambiar password del usuario actual
 * @access  Private
 */
router.post(
  "/cambiar-password",
  verificarToken,
  authController.cambiarPassword
);

/**
 * @route   GET /api/auth/verificar-token
 * @desc    Verificar si el token es válido
 * @access  Private
 */
router.get("/verificar-token", verificarToken, authController.verificarToken);

module.exports = router;
