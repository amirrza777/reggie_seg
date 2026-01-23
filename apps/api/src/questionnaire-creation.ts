import {Router} from 'express';
import {PrismaClient} from '@prisma/client';
import crypto from 'crypto';
import assert = require('assert');
import ok = require('assert');

const prisma = new PrismaClient();
const router = Router();


router.post('/', async (req, res) => {
    const {templateName, questions} = req.body;

    if (!templateName || !Array.isArray(questions)) {
        return res.status(400).json({error: 'Invalid request body'});
    }

    try {
        const templateID = Date.now() // generate a shared template ID based on timestamp

        // loop over the questions of same template and save each question with same templateID
        for(const question of questions){
            const questionHash = crypto.createHash('sha256').update(JSON.stringify(question)).digest('hex');

            await prisma.questionnaireTemplate.create({
                data: {
                    id: templateID,
                    templateName,
                    questionText: JSON.stringify(question),
                    questionHash
                }
            });
        }
        res.json({ok:true});
    }catch(error){
        console.error('Error creating questionnaire template:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});