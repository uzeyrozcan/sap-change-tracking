const cds = require('@sap/cds')
const ProvisioningService = require('./provisioning.js')

cds.on('served', () => {
  const { 'cds.xt.SaasProvisioningService': sps } = cds.services
  // Add provisioning logic if only multitenancy is there
  if (sps) {
    sps.prepend(new ProvisioningService().service);
  } else {
    cds.log().warn("There is no service, therefore does not serve multitenancy!");
  }
})