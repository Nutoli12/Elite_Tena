import { readFile, writeFile } from 'fs/promises';

async function fixLabControllerReferences() {
  try {
    console.log('🔧 Fixing Lab Controller References...\n');

    // Fix labResultController.js
    console.log('📝 Updating labResultController.js...');
    let labResultController = await readFile('./server/src/controllers/labResultController.js', 'utf8');
    
    // Replace all remaining references
    labResultController = labResultController
      .replace(/LabOrder\./g, 'LabWorkflowOrder.')
      .replace(/LabResult\./g, 'LabWorkflowResult.')
      .replace(/LabTestCatalog\./g, 'LabWorkflowTestCatalog.')
      .replace(/LabAccessLog\./g, 'LabWorkflowAccessLog.')
      .replace(/model: LabOrder,/g, 'model: LabWorkflowOrder,')
      .replace(/model: LabResult,/g, 'model: LabWorkflowResult,')
      .replace(/await LabResult\.findByPk/g, 'await LabWorkflowResult.findByPk')
      .replace(/await LabOrder\.findByPk/g, 'await LabWorkflowOrder.findByPk');

    await writeFile('./server/src/controllers/labResultController.js', labResultController);
    console.log('✅ labResultController.js updated');

    // Fix labOrderController.js (any remaining references)
    console.log('📝 Updating labOrderController.js...');
    let labOrderController = await readFile('./server/src/controllers/labOrderController.js', 'utf8');
    
    labOrderController = labOrderController
      .replace(/LabOrder\./g, 'LabWorkflowOrder.')
      .replace(/LabResult\./g, 'LabWorkflowResult.')
      .replace(/LabTestCatalog\./g, 'LabWorkflowTestCatalog.')
      .replace(/LabAccessLog\./g, 'LabWorkflowAccessLog.')
      .replace(/model: LabOrder,/g, 'model: LabWorkflowOrder,')
      .replace(/model: LabResult,/g, 'model: LabWorkflowResult,');

    await writeFile('./server/src/controllers/labOrderController.js', labOrderController);
    console.log('✅ labOrderController.js updated');

    // Fix labWorkflow.js routes (any remaining references)
    console.log('📝 Updating labWorkflow.js routes...');
    let labWorkflowRoutes = await readFile('./server/src/routes/labWorkflow.js', 'utf8');
    
    labWorkflowRoutes = labWorkflowRoutes
      .replace(/LabOrder\./g, 'LabWorkflowOrder.')
      .replace(/LabResult\./g, 'LabWorkflowResult.')
      .replace(/LabTestCatalog\./g, 'LabWorkflowTestCatalog.')
      .replace(/LabAccessLog\./g, 'LabWorkflowAccessLog.')
      .replace(/model: LabOrder,/g, 'model: LabWorkflowOrder,')
      .replace(/model: LabResult,/g, 'model: LabWorkflowResult,');

    await writeFile('./server/src/routes/labWorkflow.js', labWorkflowRoutes);
    console.log('✅ labWorkflow.js routes updated');

    console.log('\n🎉 All Lab Controller References Fixed!');
    console.log('🚀 Ready to test the Lab Workflow System');

  } catch (error) {
    console.error('💥 Error fixing references:', error);
  }
}

fixLabControllerReferences();