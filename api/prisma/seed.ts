import { PrismaClient } from '@prisma/client';
import fs from 'fs';
// @ts-ignore
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function main() {
  const produtosParaInserir: any[] = [];
  let contadorLinhas = 0;

  console.log('Lendo arquivo CSV...');

  fs.createReadStream('/home/celio/Downloads/ESTOQUE - Plan1.csv')
    .pipe(csv({ 
        separator: ',', // Mudamos de vírgula para ponto e vírgula
        mapHeaders: ({ header }) => header.trim() 
    }))
    .on('data', (row) => {
      // Isso vai imprimir a primeira linha no seu terminal para vermos como o arquivo está sendo lido
      if (contadorLinhas === 0) {
          console.log('--- VEJA COMO O SCRIPT ESTÁ LENDO A PRIMEIRA LINHA ---');
          console.log(row);
          console.log('------------------------------------------------------');
      }
      contadorLinhas++;

      // REGRA DE SEGURANÇA: Se a linha não tiver a "Descrição produto", nós ignoramos
      if (!row['Descrição produto'] || row['Descrição produto'].trim() === '') {
          return; 
      }

      const estoqueAtual = parseFloat(row['Est. Atual']) || 0;
      const precoVarejo = parseFloat(row['Preço v. varejo']) || 0;

      produtosParaInserir.push({
        sku: row['Código'] ? String(row['Código']) : null, 
        name: row['Descrição produto'],
        unit: row['UN Venda'] || 'UN',
        basePrice: precoVarejo,
        stock: estoqueAtual,
      });
    })
    .on('end', async () => {
      console.log(`Foram preparados ${produtosParaInserir.length} produtos válidos. Salvando no banco de dados...`);
      
      if (produtosParaInserir.length === 0) {
          console.log("Nenhum produto foi preparado. Precisamos ajustar o separador ou os nomes das colunas!");
          return;
      }

      try {
        await prisma.product.createMany({
          data: produtosParaInserir,
          skipDuplicates: true,
        });
        console.log('Importação concluída com sucesso! 🎉');
      } catch (error) {
        console.error('Erro detalhado ao salvar no banco:', error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main();