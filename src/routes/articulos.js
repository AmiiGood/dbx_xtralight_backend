const express = require("express");
const router = express.Router();
const articulosController = require("../controllers/articulosController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

router.use(verificarToken);

/**
 * @route   GET /api/articulos
 * @desc    Listar todos los artículos con filtros opcionales
 * @access  Private
 * @query   ?categoria=crocs&tipo_etiqueta=qr&activo=true&search=SKU123
 */
router.get("/", articulosController.listarArticulos);

/**
 * @route   GET /api/articulos/categorias
 * @desc    Obtener lista de categorías únicas
 * @access  Private
 */
router.get("/categorias", articulosController.obtenerCategorias);

/**
 * @route   GET /api/articulos/sku/:sku
 * @desc    Buscar artículo por SKU
 * @access  Private
 */
router.get("/sku/:sku", articulosController.buscarPorSku);

/**
 * @route   GET /api/articulos/:id
 * @desc    Obtener artículo por ID
 * @access  Private
 */
router.get("/:id", articulosController.obtenerArticulo);

/**
 * @route   POST /api/articulos
 * @desc    Crear nuevo artículo
 * @access  Private (Admin, Supervisor)
 */
router.post(
  "/",
  verificarRol("Administrador", "Supervisor"),
  articulosController.crearArticulo
);

/**
 * @route   PUT /api/articulos/:id
 * @desc    Actualizar artículo
 * @access  Private (Admin, Supervisor)
 */
router.put(
  "/:id",
  verificarRol("Administrador", "Supervisor"),
  articulosController.actualizarArticulo
);

/**
 * @route   DELETE /api/articulos/:id
 * @desc    Eliminar (desactivar) artículo
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  verificarRol("Administrador"),
  articulosController.eliminarArticulo
);

/**
 * @route   PATCH /api/articulos/:id/estado
 * @desc    Activar/Desactivar artículo
 * @access  Private (Admin)
 */
router.patch(
  "/:id/estado",
  verificarRol("Administrador"),
  articulosController.cambiarEstado
);

module.exports = router;
