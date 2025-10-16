const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

/**
 * Login de usuario
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username y password son requeridos",
      });
    }

    // Buscar usuario
    const result = await query(
      `SELECT u.id, u.uuid, u.username, u.email, u.password_hash, 
              u.nombre, u.apellido, u.rol_id, r.nombre as rol_nombre,
              u.activo
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const usuario = result.rows[0];

    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo. Contacta al administrador.",
      });
    }

    // Verificar password
    const passwordValido = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    // Login exitoso - actualizar último acceso
    await query(
      `UPDATE usuarios 
       SET ultimo_acceso = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    );

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: usuario.id,
        username: usuario.username,
        rol: usuario.rol_nombre,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    // Responder con token y datos del usuario
    res.json({
      success: true,
      message: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
        rol: usuario.rol_nombre,
        rolId: usuario.rol_id,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar login",
    });
  }
};

/**
 * Obtener información del usuario actual (desde el token)
 */
const obtenerPerfil = async (req, res) => {
  try {
    // req.user ya está disponible gracias al middleware verificarToken
    const result = await query(
      `SELECT u.id, u.uuid, u.username, u.email, u.nombre, u.apellido,
              u.rol_id, r.nombre as rol_nombre, u.ultimo_acceso, u.created_at
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const usuario = result.rows[0];

    res.json({
      success: true,
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
        rol: usuario.rol_nombre,
        rolId: usuario.rol_id,
        ultimoAcceso: usuario.ultimo_acceso,
        creadoEn: usuario.created_at,
      },
    });
  } catch (error) {
    console.error("Error en obtenerPerfil:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener perfil",
    });
  }
};

/**
 * Cambiar password del usuario actual
 */
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    // Validar datos
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        success: false,
        message: "Password actual y nuevo son requeridos",
      });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        success: false,
        message: "El password nuevo debe tener al menos 6 caracteres",
      });
    }

    // Obtener password actual del usuario
    const result = await query(
      "SELECT password_hash FROM usuarios WHERE id = $1",
      [req.user.id]
    );

    const usuario = result.rows[0];

    // Verificar password actual
    const passwordValido = await bcrypt.compare(
      passwordActual,
      usuario.password_hash
    );

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        message: "Password actual incorrecto",
      });
    }

    // Hashear nuevo password
    const nuevoHash = await bcrypt.hash(passwordNuevo, 10);

    // Actualizar password
    await query(
      "UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [nuevoHash, req.user.id]
    );

    res.json({
      success: true,
      message: "Password actualizado correctamente",
    });
  } catch (error) {
    console.error("Error en cambiarPassword:", error);
    res.status(500).json({
      success: false,
      message: "Error al cambiar password",
    });
  }
};

/**
 * Verificar si el token es válido
 */
const verificarToken = async (req, res) => {
  // Si llegó hasta aquí, el token es válido (verificado por middleware)
  res.json({
    success: true,
    message: "Token válido",
    usuario: req.user,
  });
};

module.exports = {
  login,
  obtenerPerfil,
  cambiarPassword,
  verificarToken,
};
