const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

router.use(verificarToken);

/**
 * @route   GET /api/usuarios
 * @desc    Listar todos los usuarios con filtros opcionales
 * @access  Private
 * @query   ?rol_id=2&activo=true&search=juan&page=1&limit=20
 */
router.get("/", usuariosController.listarUsuarios);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener usuario por ID
 * @access  Private
 * @param   id - ID del usuario
 */
router.get("/:id", usuariosController.obtenerUsuarioPorId);

/**
 * @route   POST /api/usuarios
 * @desc    Crear nuevo usuario
 * @access  Private
 */
router.post(
  "/",
  verificarRol("Administrador"),
  usuariosController.crearUsuario
);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar usuario
 * @access  Private
 * @param   id - ID del usuario
 */
router.put(
  "/:id",
  verificarRol("Administrador"),
  usuariosController.actualizarUsuario
);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar usuario
 * @access  Private
 * @param   id - ID del usuario
 */
router.delete(
  "/:id",
  verificarRol("Administrador"),
  usuariosController.eliminarUsuario
);

module.exports = router;
