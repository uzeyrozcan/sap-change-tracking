const cds = require('@sap/cds');
const xsenv = require('@sap/xsenv');
const Logger = cds.log('provisioning');

class Provisioning {
  service = (service) => {
    service.on('dependencies', async (req, next) => {
      let dependencies = await next();

      const service = xsenv.getServices({
        dest: { tag: "destination" },
        conn: { tag: "connectivity" },
        themeDesigner: { tag: 'sap-theming'}  // Get UI Theme Designer service

      });

      dependencies.push({ xsappname: service.dest.xsappname });
      dependencies.push({ xsappname: service.conn.xsappname });
      dependencies.push({ xsappname: service.themeDesigner.uaa.xsappname});    // Add UI Theme Designer service as additional dependency
      Logger.log('SaaS Dependencies:', JSON.stringify(dependencies));   
      return dependencies;
    });


  };
}

module.exports = Provisioning;
