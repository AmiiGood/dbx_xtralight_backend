const { query } = require("../config/database");

/**
 * Listar artículos con filtros
 */
const listarArticulos = async (req, res) => {
  try {
    const {
      categoria,
      tipo_etiqueta,
      activo,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    // Filtro por categoría
    if (categoria) {
      whereConditions.push(`categoria = $${paramCount}`);
      params.push(categoria);
      paramCount++;
    }

    // Filtro por tipo de etiqueta
    if (tipo_etiqueta) {
      whereConditions.push(`tipo_etiqueta = $${paramCount}`);
      params.push(tipo_etiqueta);
      paramCount++;
    }

    // Filtro por estado activo
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCount}`);
      params.push(activo === "true");
      paramCount++;
    }

    // Búsqueda por SKU o descripción
    if (search) {
      whereConditions.push(
        `(sku ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Contar total de registros
    const countResult = await query(
      `SELECT COUNT(*) as total FROM articulos ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    // Obtener artículos
    const result = await query(
      `SELECT id, sku, descripcion, categoria, color, size, 
              tipo_etiqueta, codigo_barras, imagen_url, activo, 
              created_at, updated_at
       FROM articulos
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en listarArticulos:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar artículos",
    });
  }
};

/**
 * Obtener categorías únicas
 */
const obtenerCategorias = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT categoria 
       FROM articulos 
       WHERE activo = true 
       ORDER BY categoria`
    );

    res.json({
      success: true,
      data: result.rows.map((row) => row.categoria),
    });
  } catch (error) {
    console.error("Error en obtenerCategorias:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
    });
  }
};

/**
 * Buscar artículo por SKU
 */
const buscarPorSku = async (req, res) => {
  try {
    const { sku } = req.params;

    const result = await query(
      `SELECT id, sku, descripcion, categoria, color, size, 
              tipo_etiqueta, codigo_barras, imagen_url, activo, 
              created_at, updated_at
       FROM articulos
       WHERE sku = $1`,
      [sku]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en buscarPorSku:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar artículo",
    });
  }
};

/**
 * Obtener artículo por ID
 */
const obtenerArticulo = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, sku, descripcion, categoria, color, size, 
              tipo_etiqueta, codigo_barras, imagen_url, activo, 
              created_at, updated_at
       FROM articulos
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en obtenerArticulo:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener artículo",
    });
  }
};

/**
 * Crear artículo
 */
const crearArticulo = async (req, res) => {
  try {
    const {
      sku,
      descripcion,
      categoria,
      color,
      size,
      tipo_etiqueta,
      codigo_barras,
      imagen_url,
    } = req.body;

    // Validaciones
    if (!sku || !descripcion || !categoria || !tipo_etiqueta) {
      return res.status(400).json({
        success: false,
        message:
          "SKU, descripción, categoría y tipo de etiqueta son requeridos",
      });
    }

    // Validar tipo de etiqueta
    if (!["qr", "barcode", "envio"].includes(tipo_etiqueta)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de etiqueta inválido (qr, barcode, envio)",
      });
    }

    // Verificar que el SKU no exista
    const existente = await query("SELECT id FROM articulos WHERE sku = $1", [
      sku,
    ]);

    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El SKU ya existe",
      });
    }

    // Insertar artículo
    const result = await query(
      `INSERT INTO articulos 
       (sku, descripcion, categoria, color, size, tipo_etiqueta, 
        codigo_barras, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        sku,
        descripcion,
        categoria,
        color || null,
        size || null,
        tipo_etiqueta,
        codigo_barras || null,
        imagen_url || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Artículo creado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en crearArticulo:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear artículo",
    });
  }
};

/**
 * Actualizar artículo
 */
const actualizarArticulo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku,
      descripcion,
      categoria,
      color,
      size,
      tipo_etiqueta,
      codigo_barras,
      imagen_url,
    } = req.body;

    // Verificar que el artículo existe
    const existe = await query("SELECT id FROM articulos WHERE id = $1", [id]);

    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
      });
    }

    // Si se cambia el SKU, verificar que no exista
    if (sku) {
      const skuExiste = await query(
        "SELECT id FROM articulos WHERE sku = $1 AND id != $2",
        [sku, id]
      );

      if (skuExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El SKU ya existe en otro artículo",
        });
      }
    }

    // Actualizar artículo
    const result = await query(
      `UPDATE articulos 
       SET sku = COALESCE($1, sku),
           descripcion = COALESCE($2, descripcion),
           categoria = COALESCE($3, categoria),
           color = COALESCE($4, color),
           size = COALESCE($5, size),
           tipo_etiqueta = COALESCE($6, tipo_etiqueta),
           codigo_barras = COALESCE($7, codigo_barras),
           imagen_url = COALESCE($8, imagen_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        sku,
        descripcion,
        categoria,
        color,
        size,
        tipo_etiqueta,
        codigo_barras,
        imagen_url,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Artículo actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en actualizarArticulo:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar artículo",
    });
  }
};

/**
 * Eliminar (desactivar) artículo
 */
const eliminarArticulo = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE articulos 
       SET activo = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, sku, descripcion`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Artículo desactivado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en eliminarArticulo:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar artículo",
    });
  }
};

/**
 * Cambiar estado (activar/desactivar)
 */
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({
        success: false,
        message: "El campo 'activo' es requerido",
      });
    }

    const result = await query(
      `UPDATE articulos 
       SET activo = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, sku, descripcion, activo`,
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artículo no encontrado",
      });
    }

    res.json({
      success: true,
      message: `Artículo ${activo ? "activado" : "desactivado"} exitosamente`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error en cambiarEstado:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar estado del artículo",
    });
  }
};

module.exports = {
  listarArticulos,
  obtenerCategorias,
  buscarPorSku,
  obtenerArticulo,
  crearArticulo,
  actualizarArticulo,
  eliminarArticulo,
  cambiarEstado,
};
