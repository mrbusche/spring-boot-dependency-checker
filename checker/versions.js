const {parse} = require('node-html-parser');
const {writeFileSync} = require('fs');

const sbVersions = ['3.1.8', '3.1.9']
sbVersions.forEach(sbVersion =>
    (async () => {
        const response = await fetch(`https://docs.spring.io/spring-boot/docs/${sbVersion}/reference/html/dependency-versions.html`);
        const versions = [];
        switch (response.status) {
            // status "OK"
            case 200:
                const template = await response.text();
                const parsedTemplate = parse(template)
                const tableBody = parsedTemplate.querySelector('table tbody');

                tableBody.childNodes.forEach(child =>
                    // there's a header row we should skip
                    child.childNodes.length === 0 ? '' :
                        versions.push({
                            group: child.childNodes[1].rawText,
                            name: child.childNodes[3].rawText,
                            version: child.childNodes[5].rawText,
                        })
                )
                console.log(versions);
                writeFileSync(`../versions/${sbVersion}.json`, JSON.stringify(versions, null,  2));
                break;
            // status "Not Found"
            case 404:
                console.log('Not Found');
                break;
        }
    })()
)
