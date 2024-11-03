require('dotenv').config();
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const INTERACCIONES_DB_ID = "128032a623658194afe7c59b5d3d3d67";
const VENDEDORES_DB_ID = "133032a6236580859bcfc7825e216fee";
const TRANSACCIONES_DB_ID = "133032a6236580a882abf315979d33b9";

const vendedoresAdicionales = [
  "Mateo Rodríguez del Zotto",
  "Joel Damato"
];

async function asignarVendedor() {
  try {
    // Obtener todas las interacciones que aún no han sido asignadas
    const response = await notion.databases.query({
      database_id: INTERACCIONES_DB_ID,
      filter: {
        property: "Asignado",
        checkbox: {
          equals: false,
        },
      },
    });

    for (const page of response.results) {
      const createdBy = page.properties["Created by"].created_by;
      if (!createdBy || !createdBy.name) {
        console.log("No se pudo encontrar el creador para la página", page.id);
        continue;
      }

      const nombreVendedor = createdBy.name;
      console.log(`Nombre del vendedor: ${nombreVendedor}`);

      const vendedoresResponse = await notion.databases.query({
        database_id: VENDEDORES_DB_ID,
        filter: {
          property: "Nombre",
          rich_text: {
            equals: nombreVendedor,
          },
        },
      });

      let vendedorId;
      if (vendedoresResponse.results.length > 0) {
        vendedorId = vendedoresResponse.results[0].id;
      } else if (vendedoresAdicionales.includes(nombreVendedor)) {
        console.log(`Asignando vendedor adicional: ${nombreVendedor}`);
        vendedorId = await crearNuevoVendedor(nombreVendedor);
      } else {
        console.log(`No se encontró un vendedor con el nombre ${nombreVendedor}`);
        continue;
      }

      // Actualizar la base de datos de transacciones con la relación y marcar como asignado
      await notion.pages.update({
        page_id: page.id,
        properties: {
          "Base Comisiones": {
            relation: [{ id: vendedorId }],
          },
          "Asignado": {
            checkbox: true,
          },
        },
      });
      console.log(`Vendedor asignado para la página ${page.id}`);
    }
  } catch (error) {
    console.error("Error al asignar vendedor:", error);
  }
}

async function crearNuevoVendedor(nombreVendedor) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: VENDEDORES_DB_ID },
      properties: {
        "Nombre": {
          title: [
            {
              text: {
                content: nombreVendedor,
              },
            },
          ],
        },
      },
    });
    console.log(`Nuevo vendedor creado: ${nombreVendedor}`);
    return response.id;
  } catch (error) {
    console.error(`Error al crear el vendedor ${nombreVendedor}:`, error);
    throw error;
  }
}

setInterval(asignarVendedor, 10000);
asignarVendedor().catch(console.error);
