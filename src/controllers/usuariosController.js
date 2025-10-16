const { query } = require("../config/database");
const bcrypt = require("bcrypt");

/**
 * Listar usuarios con filtros
 */

const listarUsuarios = async (req, res) => {
  try {
    const { rol_id, activo, search, page = 1, limit = 50 } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    // Filtrar por rol_id
    if (rol_id) {
      whereConditions.push(`rol_id = $${paramCounter}`);
      params.push(rol_id);
      paramCount++;
    }

    // Filtrar por estado activo
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCount}`);
      params.push(activo === "true");
      paramCount++;
    }

    // Búsqueda por nombre, email o username
    if (search) {
      whereConditions.push(
        `(nombre ILIKE $${paramCount} OR email ILIKE $${paramCount}) OR username ILIKE $${paramCount}`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    // Contar total de registros
    const countResult = await query(
      `SELECT COUNT(*) FROM usuarios ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    // Obtener usuarios
    const result = await query(
      `SELECT id, username, email, nombre, apellido, 
      rol_id, activo, ultimo_acceso, created_at, updated_at 
      FROM usuarios ${whereClause} 
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
    console.error("Error al listar usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar usuarios",
    });
  }
};

/**
 * Obtener usuario por ID
 */
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, username, email, nombre, apellido, 
      rol_id, activo, ultimo_acceso, created_at, updated_at 
      FROM usuarios WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener usuario",
    });
  }
};

/**
 * Crear usuario
 */
const crearUsuario = async (req, res) => {
  try {
    const { username, email, nombre, apellido, rol_id, password } = req.body;

    // Validaciones
    if (!username || !email || !nombre || !apellido || !rol_id || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username, email, nombre, apellido, rol_id y password son requeridos",
      });
    }

    // Verificar si el username o email ya existen
    const existente = await query(
      "SELECT id FROM usuarios WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El username o email ya están en uso",
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO usuarios (username, email, nombre, apellido, rol_id, password_hash, activo, ultimo_acceso, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id, username, email, nombre, apellido, rol_id, activo, created_at, updated_at`,
      [username, email, nombre, apellido, rol_id, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear usuario",
    });
  }
};

/**
 * Actualizar usuario
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, nombre, apellido, rol_id, activo, password } =
      req.body;

    // Verificar si el usuario existe
    const usuarioExistente = await query(
      "SELECT id FROM usuarios WHERE id = $1",
      [id]
    );
    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // Construir campos a actualizar
    let fields = [];
    let params = [];
    let paramCount = 1;

    if (username) {
      fields.push(`username = $${paramCount}`);
      params.push(username);
      paramCount++;
    }
    if (email) {
      fields.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }
    if (nombre) {
      fields.push(`nombre = $${paramCount}`);
      params.push(nombre);
      paramCount++;
    }
    if (apellido) {
      fields.push(`apellido = $${paramCount}`);
      params.push(apellido);
      paramCount++;
    }
    if (rol_id) {
      fields.push(`rol_id = $${paramCount}`);
      params.push(rol_id);
      paramCount++;
    }
    if (activo !== undefined) {
      fields.push(`activo = $${paramCount}`);
      params.push(activo === true || activo === "true");
      paramCount++;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${paramCount}`);
      params.push(hashedPassword);
      paramCount++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No hay campos para actualizar",
      });
    }

    params.push(id);

    const result = await query(
      `UPDATE usuarios SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING id, uuid, username, email, nombre, apellido, rol_id, activo, ultimo_acceso, created_at, updated_at`,
      params
    );

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
    });
  }
};

/**
 * Eliminar (desactivar) usuario
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, username, email, nombre, apellido, rol_id, activo, ultimo_acceso, created_at, updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Usuario desactivado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
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
      `UPDATE usuarios SET activo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, nombre, apellido, rol_id, activo, ultimo_acceso, created_at, updated_at`,
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      message: `Usuario ${activo ? "activado" : "desactivado"} exitosamente`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al cambiar estado del usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar estado del usuario",
    });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstado,
};
