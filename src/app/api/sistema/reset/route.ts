import { NextResponse } from "next/server";

export async function POST() {
  // Función deshabilitada permanentemente para proteger la integridad de los datos
  return NextResponse.json(
    { error: "La función de restablecimiento o borrado de base de datos ha sido deshabilitada para proteger los datos existentes." },
    { status: 403 }
  );
}
