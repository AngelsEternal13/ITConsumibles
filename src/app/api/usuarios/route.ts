import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const list = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        usuario: usuarios.usuario,
        correo: usuarios.correo,
        rol: usuarios.rol,
        fecha_creacion: usuarios.fecha_creacion,
      })
      .from(usuarios);
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "lector") {
      return NextResponse.json(
        { error: "No tiene permisos para crear usuarios. Se requiere rol de Administrador." },
        { status: 403 }
      );
    }
    const usuarioEjecutor = session?.user?.name || session?.user?.email || "Administrador";

    const body = await req.json();
    const { nombre, usuario, correo, password, rol } = body;

    if (!nombre || !password) {
      return NextResponse.json({ error: "Nombre y contraseña son obligatorios" }, { status: 400 });
    }

    const cleanNombre = nombre.trim();
    const cleanUsuario = (usuario || cleanNombre.toLowerCase().replace(/\s+/g, "")).trim().toLowerCase();
    const cleanCorreo = (correo || `${cleanUsuario}@empresa.com`).trim().toLowerCase();

    // Validar si el usuario o correo ya existe
    const existing = await db
      .select()
      .from(usuarios)
      .where(or(eq(usuarios.correo, cleanCorreo), eq(usuarios.usuario, cleanUsuario)))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].usuario === cleanUsuario) {
        return NextResponse.json({ error: `El nombre de usuario "${cleanUsuario}" ya está registrado` }, { status: 409 });
      }
      return NextResponse.json({ error: `El correo "${cleanCorreo}" ya está registrado` }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [nuevo] = await db
      .insert(usuarios)
      .values({
        nombre: cleanNombre,
        usuario: cleanUsuario,
        correo: cleanCorreo,
        password: hashedPassword,
        rol: rol || "lector",
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        usuario: usuarios.usuario,
        correo: usuarios.correo,
        rol: usuarios.rol,
        fecha_creacion: usuarios.fecha_creacion,
      });

    await registrarAuditoria({
      usuario: usuarioEjecutor,
      accion: "CREATE",
      tabla: "usuarios",
      registro_id: nuevo.id,
      valor_nuevo: { nombre: nuevo.nombre, usuario: nuevo.usuario, correo: nuevo.correo, rol: nuevo.rol },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al crear usuario" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "lector") {
      return NextResponse.json(
        { error: "No tiene permisos para modificar usuarios. Se requiere rol de Administrador." },
        { status: 403 }
      );
    }
    const usuarioEjecutor = session?.user?.name || session?.user?.email || "Administrador";

    const body = await req.json();
    const { id, nombre, usuario, correo, password, rol } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const [actual] = await db.select().from(usuarios).where(eq(usuarios.id, Number(id))).limit(1);
    if (!actual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    if (nombre) updateData.nombre = nombre.trim();
    if (usuario) updateData.usuario = usuario.trim().toLowerCase();
    if (correo) updateData.correo = correo.trim().toLowerCase();
    if (rol) updateData.rol = rol;
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const [actualizado] = await db
      .update(usuarios)
      .set(updateData)
      .where(eq(usuarios.id, Number(id)))
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        usuario: usuarios.usuario,
        correo: usuarios.correo,
        rol: usuarios.rol,
        fecha_creacion: usuarios.fecha_creacion,
      });

    await registrarAuditoria({
      usuario: usuarioEjecutor,
      accion: "UPDATE",
      tabla: "usuarios",
      registro_id: id,
      valor_anterior: { nombre: actual.nombre, usuario: actual.usuario, correo: actual.correo, rol: actual.rol },
      valor_nuevo: { nombre: actualizado.nombre, usuario: actualizado.usuario, correo: actualizado.correo, rol: actualizado.rol },
    });

    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role === "lector") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar usuarios. Se requiere rol de Administrador." },
        { status: 403 }
      );
    }
    const usuarioEjecutor = session?.user?.name || session?.user?.email || "Administrador";

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const [actual] = await db.select().from(usuarios).where(eq(usuarios.id, Number(id))).limit(1);
    if (!actual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Proteger cuenta principal de administrador
    if (actual.usuario === "admin" && actual.id === 1) {
      return NextResponse.json({ error: "No se puede eliminar la cuenta principal de Administrador" }, { status: 403 });
    }

    await db.delete(usuarios).where(eq(usuarios.id, Number(id)));

    await registrarAuditoria({
      usuario: usuarioEjecutor,
      accion: "DELETE",
      tabla: "usuarios",
      registro_id: Number(id),
      valor_anterior: { nombre: actual.nombre, usuario: actual.usuario, correo: actual.correo, rol: actual.rol },
    });

    return NextResponse.json({ message: "Usuario eliminado con éxito" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al eliminar usuario" }, { status: 500 });
  }
}
